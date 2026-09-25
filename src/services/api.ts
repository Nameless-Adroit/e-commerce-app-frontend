import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../config/apiConfig';
import { 
  ApiResponse, 
  User, 
  Product, 
  Transaction, 
  TransactionSummary,
  CheckoutTransaction,
  DailyReport, 
  GlobalSummary, 
  Shop,
  ShopRequest,
  Business,
  ReturnPayload,
  ReturnResponse,
  TopProduct,
  ProductSoldReportItem,
  ProductsSoldReportResponse,
  DailyReconciliation,
  SubscriptionPlan,
  SubscriptionPayment,
  PaymentMethodConfig,
  PlatformConfig,
  BusinessRegistrationPayload
} from '../types';

const TOKEN_KEY = 'POS_AUTH_TOKEN';
const ACTIVE_SHOP_KEY = 'POS_ACTIVE_SHOP_ID';

// Short-lived 15-minute Access Token is held EXCLUSIVELY in application memory
let inMemoryToken: string | null = null;
let inMemoryActiveShopId: number | null = null;

// Mutex & Queue for handling concurrent 401 requests during token refresh
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null, error?: any) => void> = [];
let onSessionExpiredCallback: (() => void) | null = null;

export function setOnSessionExpired(callback: () => void): void {
  onSessionExpiredCallback = callback;
}

function subscribeTokenRefresh(cb: (token: string | null, error?: any) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null, error?: any) {
  refreshSubscribers.forEach(cb => cb(token, error));
  refreshSubscribers = [];
}

export async function setAuthToken(token: string | null): Promise<void> {
  inMemoryToken = token;
  // Clean up any legacy persisted tokens to ensure access tokens reside only in memory
  if (!token) {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore cleanup error
    }
  }
}

export async function getAuthToken(): Promise<string | null> {
  return inMemoryToken;
}

export async function setActiveShopId(shopId: number | null): Promise<void> {
  inMemoryActiveShopId = shopId;
  if (shopId) {
    await AsyncStorage.setItem(ACTIVE_SHOP_KEY, String(shopId));
  } else {
    await AsyncStorage.removeItem(ACTIVE_SHOP_KEY);
  }
}

export async function getActiveShopId(): Promise<number | null> {
  if (inMemoryActiveShopId !== null) return inMemoryActiveShopId;
  try {
    const stored = await AsyncStorage.getItem(ACTIVE_SHOP_KEY);
    inMemoryActiveShopId = stored ? parseInt(stored, 10) : null;
    return inMemoryActiveShopId;
  } catch {
    return null;
  }
}

/**
 * Sanitizes server error messages: ensures no technical token/JWT/crypto jargon
 * is ever rendered to the end-user. Logs technical details to console.warn.
 */
function sanitizeMobileErrorMessage(msg?: string | null): string {
  if (!msg) return 'The requested operation could not be completed. Please try again.';
  if (/token|jwt|bearer|malformed|signature|refresh_token|expired/i.test(msg)) {
    console.warn('[AUTH_SECURITY_LOG] Sanitized internal authentication error:', msg);
    return 'Your session has expired. Please sign in to continue.';
  }
  return msg;
}

/**
 * Generic Fetch wrapper with JSON parsing, error formatting, and centralized 401 token refresh
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = await getAuthToken();
  const activeShopId = await getActiveShopId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // On native platforms, custom headers are not subject to browser CORS preflight.
  // On Web, browsers reject requests if X-Shop-Id is not listed in server's Access-Control-Allow-Headers.
  if (activeShopId && Platform.OS !== 'web' && !headers['X-Shop-Id']) {
    headers['X-Shop-Id'] = String(activeShopId);
  }

  let url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Pass shop_id as query parameter (supported by the backend enforceShopScope middleware)
  // so Web works reliably without triggering custom header CORS preflight issues.
  if (activeShopId) {
    const hasShopIdInQuery = /(?:[?&])shop_id=/.test(url);
    if (!hasShopIdInQuery) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}shop_id=${encodeURIComponent(String(activeShopId))}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Transmit HTTP-only refresh cookies on Web and native fetch
    });

    // -------------------------------------------------------------------------
    // Centralized 401 Access Token Expiration & Refresh Queue Handler
    // -------------------------------------------------------------------------
    const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh');
    if (response.status === 401 && !isAuthEndpoint) {
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          // Attempt silent token refresh via HTTP-only cookie
          const refreshRes = await authApi.refresh();
          const newToken = refreshRes.data?.token || null;
          await setAuthToken(newToken);
          isRefreshing = false;
          onRefreshed(newToken, null);

          // Retry the original request with the fresh token
          headers['Authorization'] = `Bearer ${newToken}`;
          return request<T>(endpoint, { ...options, headers });
        } catch (refreshErr) {
          isRefreshing = false;
          await setAuthToken(null);
          const sessionErr = new Error('Session expired. Please sign in again.');
          (sessionErr as any).statusCode = 401;
          onRefreshed(null, sessionErr);
          if (onSessionExpiredCallback) {
            onSessionExpiredCallback();
          }
          throw sessionErr;
        }
      } else {
        // Another request is already refreshing the token. Queue this request until resolved.
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh((newToken, refreshErr) => {
            if (refreshErr || !newToken) {
              const sessionErr = new Error('Session expired. Please sign in again.');
              (sessionErr as any).statusCode = 401;
              return reject(sessionErr);
            }
            headers['Authorization'] = `Bearer ${newToken}`;
            resolve(request<T>(endpoint, { ...options, headers }));
          });
        });
      }
    }

    const contentType = response.headers.get('content-type') || '';
    const json = contentType.includes('application/json')
      ? await response.json()
      : null;

    if (!response.ok) {
      const rawMsg = json?.message || (response.status >= 500
        ? 'Store service is temporarily unavailable. Please try again in a few moments.'
        : 'The requested operation could not be completed. Please try again.');
      const errorMsg = sanitizeMobileErrorMessage(rawMsg);
      const err = new Error(errorMsg);
      (err as any).statusCode = response.status;
      (err as any).response = json;
      throw err;
    }

    if (!json) {
      throw new Error('Unable to process response from store server. Please try again.');
    }

    return json as T;
  } catch (err: any) {
    const rawMsg = String(err?.message || '');
    const isNetworkIssue =
      rawMsg.includes('Network request failed') ||
      rawMsg.includes('Failed to fetch') ||
      rawMsg.includes('NetworkError') ||
      rawMsg.includes('timeout') ||
      rawMsg.includes('aborted') ||
      err.name === 'TypeError';

    if (isNetworkIssue) {
      throw new Error('No internet connection. Please check your network connection and try again.');
    }

    if (err.message) {
      err.message = sanitizeMobileErrorMessage(err.message);
    }
    throw err;
  }
}

// -----------------------------------------------------------------------------
// Authentication & User Management API
// -----------------------------------------------------------------------------
export const authApi = {
  /**
   * Phone Number + 6-Digit PIN Authentication
   */
  async login(credentials: {
    phoneNumber?: string;
    pin?: string;
    identifier?: string;
    secret?: string;
    deviceName?: string;
  }): Promise<ApiResponse<{ token: string; redirect_url: string; user: User; sessionId: string }>> {
    const res = await request<ApiResponse<{ token: string; redirect_url: string; user: User; sessionId: string }>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.data?.token) {
      await setAuthToken(res.data.token);
    }
    return res;
  },

  /**
   * Rotates refresh token via HTTP-only cookie and obtains fresh 15-minute access token
   */
  async refresh(): Promise<ApiResponse<{ token: string; sessionId: string }>> {
    try {
      const res = await request<ApiResponse<{ token: string; sessionId: string }>>('/auth/refresh', {
        method: 'POST'
      });
      if (res.data?.token) {
        await setAuthToken(res.data.token);
      }
      return res;
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('refresh token') || err?.statusCode === 401) {
        const cleanErr = new Error('Session expired. Please sign in again.');
        (cleanErr as any).statusCode = 401;
        throw cleanErr;
      }
      throw err;
    }
  },

  /**
   * Logout current device session
   */
  async logout(): Promise<void> {
    try {
      await request<ApiResponse<any>>('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    } finally {
      await setAuthToken(null);
      await setActiveShopId(null);
    }
  },

  /**
   * Revoke all active sessions across all devices
   */
  async logoutAll(): Promise<void> {
    try {
      await request<ApiResponse<any>>('/auth/logout-all', { method: 'POST' });
    } finally {
      await setAuthToken(null);
      await setActiveShopId(null);
    }
  },

  /**
   * Get active authenticated sessions for current user
   */
  async getSessions(): Promise<ApiResponse<{ sessions: any[] }>> {
    return request<ApiResponse<{ sessions: any[] }>>('/auth/sessions');
  },

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<ApiResponse<any>> {
    return request<ApiResponse<any>>(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });
  },

  async getProfile(): Promise<ApiResponse<User>> {
    return request<ApiResponse<User>>('/auth/profile');
  },

  async updateProfile(data: { full_name?: string; phone_number?: string; profile_image?: string }): Promise<ApiResponse<User>> {
    return request<ApiResponse<User>>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async setPin(pin: string, oldPin?: string): Promise<ApiResponse<any>> {
    return request<ApiResponse<any>>('/auth/pin', {
      method: 'POST',
      body: JSON.stringify({ pin, oldPin })
    });
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    return request<ApiResponse<any>>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
    });
  },

  async resetPassword(userId: number, newPassword: string): Promise<ApiResponse<any>> {
    return request<ApiResponse<any>>(`/auth/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword })
    });
  },

  async setUserStatus(userId: number, isActive: boolean): Promise<ApiResponse<any>> {
    return request<ApiResponse<any>>(`/auth/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive })
    });
  },

  async listUsers(params: { role?: string; business_id?: number; shop_id?: number } = {}): Promise<ApiResponse<{ users: User[] }>> {
    const query = new URLSearchParams();
    if (params.role) query.append('role', params.role);
    if (params.business_id) query.append('business_id', String(params.business_id));
    if (params.shop_id) query.append('shop_id', String(params.shop_id));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<ApiResponse<{ users: User[] }>>(`/auth/users${qs}`);
  },

  async registerUser(userData: {
    username?: string;
    email?: string;
    phone_number?: string;
    password?: string;
    pin?: string;
    role: string;
    full_name: string;
    business_id?: number;
    shop_id?: number;
  }): Promise<ApiResponse<User>> {
    return request<ApiResponse<User>>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async updateUser(userId: number, updateData: {
    full_name?: string;
    phone_number?: string;
    email?: string;
    role?: string;
    business_id?: number;
    shop_id?: number;
    profile_image?: string;
    pin?: string;
  }): Promise<ApiResponse<User>> {
    return request<ApiResponse<User>>(`/auth/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  async registerBusiness(data: BusinessRegistrationPayload): Promise<ApiResponse<{
    business: Business;
    admin: User;
    plan: SubscriptionPlan;
    instructions?: string;
  }>> {
    return request<ApiResponse<any>>('/auth/register-business', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// -----------------------------------------------------------------------------
// Products API (Admin Module)
// -----------------------------------------------------------------------------
export const productApi = {
  async generateId(): Promise<ApiResponse<{ product_id: string; shop_code: string; format: string }>> {
    return request<ApiResponse<{ product_id: string; shop_code: string; format: string }>>('/products/generate-id', {
      method: 'POST'
    });
  },

  async listProducts(params: {
    search?: string;
    category?: string;
    low_stock?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<{ products: Product[]; pagination: { total: number; limit: number; offset: number } }>> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category) query.append('category', params.category);
    if (params.low_stock) query.append('low_stock', 'true');
    if (params.limit) query.append('limit', String(params.limit));
    if (params.offset) query.append('offset', String(params.offset));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<ApiResponse<{ products: Product[]; pagination: { total: number; limit: number; offset: number } }>>(`/products${qs}`);
  },

  async getProductById(id: string): Promise<ApiResponse<Product>> {
    return request<ApiResponse<Product>>(`/products/${encodeURIComponent(id)}`);
  },

  async createProduct(productData: {
    id?: string;
    name: string;
    description?: string;
    category?: string;
    price: number;
    cost_price?: number;
    initial_stock?: number;
    reorder_level?: number;
  }): Promise<ApiResponse<Product>> {
    return request<ApiResponse<Product>>('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  async updateProduct(id: string, updateData: {
    name?: string;
    description?: string;
    category?: string;
    price?: number;
    cost_price?: number;
    reorder_level?: number;
  }): Promise<ApiResponse<Product>> {
    return request<ApiResponse<Product>>(`/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  async restock(id: string, quantity: number, reason?: string, changeType: 'restock' | 'return' = 'restock'): Promise<ApiResponse<any>> {
    return request<ApiResponse<any>>(`/products/${encodeURIComponent(id)}/restock`, {
      method: 'POST',
      body: JSON.stringify({ quantity, reason, change_type: changeType })
    });
  },

  async recordShrinkage(id: string, quantity: number, reason?: string): Promise<ApiResponse<any>> {
    return request<ApiResponse<any>>(`/products/${encodeURIComponent(id)}/shrinkage`, {
      method: 'POST',
      body: JSON.stringify({ quantity, reason })
    });
  },

  async getQRLabelsUrl(id: string, count: number = 15): Promise<string> {
    const baseUrl = getApiBaseUrl();
    const token = await getAuthToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    return `${baseUrl}/products/${encodeURIComponent(id)}/qr-labels?count=${count}${tokenParam}`;
  }
};

// -----------------------------------------------------------------------------
// Point of Sale API (Seller Module)
// -----------------------------------------------------------------------------
export const posApi = {
  async scanProduct(id: string): Promise<ApiResponse<Product & { is_in_stock: boolean; low_stock_warning: boolean }>> {
    return request<ApiResponse<Product & { is_in_stock: boolean; low_stock_warning: boolean }>>(`/pos/scan/${encodeURIComponent(id)}`);
  },

  async checkout(
    items: { productId: string; quantity: number; unitPrice?: number }[],
    paymentMethod: Transaction['payment_method'] = 'cash',
    notes?: string,
    discount = 0
  ): Promise<ApiResponse<CheckoutTransaction>> {
    return request<ApiResponse<CheckoutTransaction>>('/pos/checkout', {
      method: 'POST',
      body: JSON.stringify({
        items,
        payment_method: paymentMethod,
        notes,
        discount
      })
    });
  },

  async processReturn(payload: ReturnPayload): Promise<ApiResponse<ReturnResponse>> {
    return request<ApiResponse<ReturnResponse>>('/pos/return', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getTransactions(params: {
    limit?: number;
    offset?: number;
    date?: string;
    start_date?: string;
    end_date?: string;
    seller_id?: number;
    status?: string;
  } = {}): Promise<ApiResponse<{ transactions: Transaction[]; summary?: TransactionSummary }>> {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', String(params.limit));
    if (params.offset) query.append('offset', String(params.offset));
    if (params.date) query.append('date', params.date);
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.seller_id) query.append('seller_id', String(params.seller_id));
    if (params.status) query.append('status', params.status);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<ApiResponse<{ transactions: Transaction[]; summary?: TransactionSummary }>>(`/pos/transactions${qs}`);
  },

  async getTransactionDetails(id: string): Promise<ApiResponse<Transaction>> {
    return request<ApiResponse<Transaction>>(`/pos/transactions/${encodeURIComponent(id)}`);
  }
};

// -----------------------------------------------------------------------------
// Analytics API (SRS 3.4)
// -----------------------------------------------------------------------------
export const analyticsApi = {
  async getDailyReport(date?: string): Promise<ApiResponse<DailyReport | { report_date: string; global_summary: GlobalSummary; shop_breakdown: DailyReport[] }>> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return request<ApiResponse<any>>(`/analytics/daily${qs}`);
  },

  async getDailyReconciliation(date?: string): Promise<ApiResponse<DailyReconciliation>> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return request<ApiResponse<DailyReconciliation>>(`/analytics/daily/reconcile${qs}`);
  },

  async triggerDailyClose(date?: string): Promise<ApiResponse<any>> {
    return request<ApiResponse<any>>('/analytics/daily/close', {
      method: 'POST',
      body: JSON.stringify({ date })
    });
  },

  async getProductsSoldReport(params: {
    startDate?: string;
    endDate?: string;
    category?: string;
    search?: string;
  } = {}): Promise<ApiResponse<ProductsSoldReportResponse>> {
    const query = new URLSearchParams();
    if (params.startDate) query.append('start_date', params.startDate);
    if (params.endDate) query.append('end_date', params.endDate);
    if (params.category) query.append('category', params.category);
    if (params.search) query.append('search', params.search);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<ApiResponse<ProductsSoldReportResponse>>(`/analytics/products-sold${qs}`);
  },

  async getReportRange(startDate: string, endDate: string): Promise<ApiResponse<{ start_date: string; end_date: string; records: DailyReport[] }>> {
    return request<ApiResponse<any>>(`/analytics/range?start_date=${startDate}&end_date=${endDate}`);
  },

  async getTopProducts(limit: number = 5): Promise<ApiResponse<{ top_products: TopProduct[] }>> {
    return request<ApiResponse<{ top_products: TopProduct[] }>>(`/analytics/top-products?limit=${limit}`);
  }
};

// -----------------------------------------------------------------------------
// Shop Management API (Super Admin)
// -----------------------------------------------------------------------------
export const shopApi = {
  async getAllShops(): Promise<ApiResponse<{ shops: Shop[] }>> {
    return request<ApiResponse<{ shops: Shop[] }>>('/shops');
  },

  async createShop(shopData: {
    business_id?: number;
    shop_code: string;
    name: string;
    address?: string;
    phone?: string;
    currency_code?: string;
    currency_symbol?: string;
    currency_name?: string;
  }): Promise<ApiResponse<Shop>> {
    return request<ApiResponse<Shop>>('/shops', {
      method: 'POST',
      body: JSON.stringify(shopData)
    });
  },

  async getShopById(id: number): Promise<ApiResponse<Shop & { staff: User[]; stats: any }>> {
    return request<ApiResponse<Shop & { staff: User[]; stats: any }>>(`/shops/${id}`);
  },

  async requestShop(data: {
    shop_code: string;
    name: string;
    address?: string;
    phone?: string;
    admin_notes?: string;
  }): Promise<ApiResponse<ShopRequest>> {
    return request<ApiResponse<ShopRequest>>('/shops/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getShopRequests(status?: string): Promise<ApiResponse<{ requests: ShopRequest[] }>> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<ApiResponse<{ requests: ShopRequest[] }>>(`/shops/requests${qs}`);
  },

  async approveShopRequest(id: number, super_admin_notes?: string): Promise<ApiResponse<{ message: string; shop_id: number; request_id: number }>> {
    return request<ApiResponse<{ message: string; shop_id: number; request_id: number }>>(`/shops/requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ super_admin_notes })
    });
  },

  async rejectShopRequest(id: number, super_admin_notes?: string): Promise<ApiResponse<{ message: string; request_id: number }>> {
    return request<ApiResponse<{ message: string; request_id: number }>>(`/shops/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ super_admin_notes })
    });
  }
};

// -----------------------------------------------------------------------------
// Business Management API (Super Admin & Admin Multi-Tenant)
// -----------------------------------------------------------------------------
export const businessApi = {
  async getAllBusinesses(): Promise<ApiResponse<Business[]>> {
    return request<ApiResponse<Business[]>>('/businesses');
  },

  async getBusinessById(id: number): Promise<ApiResponse<Business & { shops: Shop[]; admins: User[]; sellers: User[] }>> {
    return request<ApiResponse<Business & { shops: Shop[]; admins: User[]; sellers: User[] }>>(`/businesses/${id}`);
  },

  async createBusiness(data: {
    name: string;
    business_code?: string;
    currency_code?: string;
    currency_symbol?: string;
    currency_name?: string;
  }): Promise<ApiResponse<Business>> {
    return request<ApiResponse<Business>>('/businesses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateBusiness(id: number, data: {
    name?: string;
    currency_code?: string;
    currency_symbol?: string;
    currency_name?: string;
    status?: 'active' | 'suspended';
  }): Promise<ApiResponse<Business>> {
    return request<ApiResponse<Business>>(`/businesses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async getBusinessOverview(id?: number): Promise<ApiResponse<{
    business: Business;
    summary: {
      shops_count: number;
      staff_count: number;
      products_count: number;
      total_units_in_stock: number;
      total_revenue: number;
      today_revenue: number;
    };
    shops: Shop[];
  }>> {
    const endpoint = id ? `/businesses/${id}/overview` : '/businesses/my/overview';
    return request<ApiResponse<any>>(endpoint);
  }
};

// -----------------------------------------------------------------------------
// Platform API (Public Configuration & Payment Methods)
// -----------------------------------------------------------------------------
export const platformApi = {
  async getConfig(): Promise<ApiResponse<PlatformConfig>> {
    return request<ApiResponse<PlatformConfig>>('/platform/config');
  },

  async getPaymentMethods(): Promise<ApiResponse<PaymentMethodConfig[]>> {
    return request<ApiResponse<PaymentMethodConfig[]>>('/platform/payment-methods');
  }
};

// -----------------------------------------------------------------------------
// Subscription & Billing API
// -----------------------------------------------------------------------------
export const subscriptionApi = {
  async getPublicPlans(): Promise<ApiResponse<{ plans: SubscriptionPlan[] }>> {
    return request<ApiResponse<{ plans: SubscriptionPlan[] }>>('/subscriptions/plans');
  },

  async getBusinessSubscription(businessId?: number): Promise<ApiResponse<{
    business_id: number;
    business_name: string;
    subscription_status: string;
    subscription_start_date: string;
    subscription_end_date: string;
    plan: SubscriptionPlan;
    days_remaining: number;
    is_expired: boolean;
    warning_level: string;
    active_shops_count: number;
    active_sellers_count: number;
    max_shops: number;
    max_sellers: number;
    payments: SubscriptionPayment[];
  }>> {
    const endpoint = businessId ? `/subscriptions/${businessId}` : '/subscriptions/my';
    return request<ApiResponse<any>>(endpoint);
  },

  async getPayments(businessId?: number): Promise<ApiResponse<{ payments: SubscriptionPayment[] }>> {
    const qs = businessId ? `?business_id=${businessId}` : '';
    return request<ApiResponse<{ payments: SubscriptionPayment[] }>>(`/subscriptions/payments${qs}`);
  },

  async renewSubscription(businessId: number, data: {
    plan_id: number;
    duration_days?: number;
    amount?: number;
    payment_method: string;
    payment_reference?: string;
    notes?: string;
  }): Promise<ApiResponse<{
    message: string;
    payment: SubscriptionPayment;
    subscription: any;
  }>> {
    return request<ApiResponse<any>>(`/subscriptions/business/${businessId}/renew`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

