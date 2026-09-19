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
  Business,
  ReturnPayload,
  ReturnResponse,
  TopProduct,
  ProductSoldReportItem,
  ProductsSoldReportResponse,
  DailyReconciliation
} from '../types';

const TOKEN_KEY = 'POS_AUTH_TOKEN';
const ACTIVE_SHOP_KEY = 'POS_ACTIVE_SHOP_ID';

let inMemoryToken: string | null = null;
let inMemoryActiveShopId: number | null = null;

export async function setAuthToken(token: string | null): Promise<void> {
  inMemoryToken = token;
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (inMemoryToken) return inMemoryToken;
  try {
    inMemoryToken = await AsyncStorage.getItem(TOKEN_KEY);
    return inMemoryToken;
  } catch {
    return null;
  }
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
 * Generic Fetch wrapper with JSON parsing and error formatting
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

  if (activeShopId && !headers['X-Shop-Id']) {
    headers['X-Shop-Id'] = String(activeShopId);
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type') || '';
    const json = contentType.includes('application/json')
      ? await response.json()
      : null;

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error('Store service is temporarily unavailable. Please try again in a few moments.');
      }
      const errorMsg = json?.message || 'The requested operation could not be completed. Please try again.';
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
    throw err;
  }
}

// -----------------------------------------------------------------------------
// Authentication & User Management API
// -----------------------------------------------------------------------------
export const authApi = {
  async login(identifier: string, password: string): Promise<ApiResponse<{ token: string; redirect_url: string; user: User }>> {
    const res = await request<ApiResponse<{ token: string; redirect_url: string; user: User }>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    if (res.data?.token) {
      await setAuthToken(res.data.token);
    }
    return res;
  },

  async getProfile(): Promise<ApiResponse<User>> {
    return request<ApiResponse<User>>('/auth/profile');
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
    username: string;
    email: string;
    password: string;
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

  async logout(): Promise<void> {
    await setAuthToken(null);
    await setActiveShopId(null);
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
