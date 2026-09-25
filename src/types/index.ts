export type Role = 'super_admin' | 'admin' | 'seller';

export interface Business {
  id: number;
  business_code: string;
  name: string;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  status: 'active' | 'suspended';
  subscription_status?: 'trial' | 'active' | 'grace_period' | 'expired' | 'suspended';
  subscription_start_date?: string;
  subscription_end_date?: string;
  subscription_plan_id?: number;
  subscription_plan_name?: string;
  subscription_plan_code?: string;
  max_shops?: number;
  max_sellers?: number;
  auto_renew?: boolean;
  notes?: string;
  days_remaining?: number;
  warning_level?: 'none' | 'info_30d' | 'warning_7d' | 'urgent_3d' | 'critical_1d' | 'expired';
  is_expired?: boolean;
  shops_count?: number;
  admins_count?: number;
  sellers_count?: number;
  total_revenue?: number;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  phone_number?: string | null;
  profile_image?: string | null;
  full_name: string;
  role: Role;
  business_id?: number | null;
  business_name?: string | null;
  business_code?: string | null;
  business_currency?: string | null;
  business_currency_symbol?: string | null;
  shop_id: number | null;
  shop_name?: string | null;
  shop_code?: string | null;
  shop_currency?: string | null;
  shop_currency_symbol?: string | null;
  shop_currency_name?: string | null;
  temporary_pin?: boolean;
  temporary_password?: boolean;
  requires_pin_setup?: boolean;
  is_active?: boolean;
  subscription_status?: 'trial' | 'active' | 'grace_period' | 'expired' | 'suspended';
  subscription_end_date?: string;
  days_remaining?: number;
  warning_level?: 'none' | 'info_30d' | 'warning_7d' | 'urgent_3d' | 'critical_1d' | 'expired';
  is_subscription_expired?: boolean;
}

export interface UserSession {
  id: string;
  deviceName: string | null;
  deviceId: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

export interface Shop {
  id: number;
  business_id?: number;
  business_name?: string;
  business_code?: string;
  shop_code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  currency_code?: string;
  currency_symbol?: string;
  currency_name?: string;
  is_active?: boolean;
  staff_count?: number;
  product_count?: number;
  total_units_in_stock?: number;
}

export interface ShopRequest {
  id: number;
  business_id: number;
  business_name?: string;
  business_code?: string;
  requested_by_user_id: number;
  requested_by_name?: string;
  requested_by_phone?: string;
  shop_code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  super_admin_notes?: string | null;
  reviewed_by_user_id?: number | null;
  reviewed_by_name?: string | null;
  created_shop_id?: number | null;
  created_at: string;
  reviewed_at?: string | null;
}

export interface Product {
  id: string; // Unique alphanumeric generated ID (e.g. PRD-SHP01-XXXX-XXXX)
  shop_id: number;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  reorder_level: number;
  shop_name?: string;
  shop_code?: string;
  currency_code?: string;
  currency_symbol?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number;
}


export interface TransactionLineItem {
  id?: number;
  product_id: string;
  product_name?: string;
  name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  remaining_stock?: number;
}

export interface Transaction {
  id: string; // TXN-SHP01-YYYYMMDD-XXXX or RTN-SHP01-YYYYMMDD-XXXX
  shop_id: number;
  shop_name?: string;
  shop_code?: string;
  seller_id: number;
  seller_name?: string;
  subtotal_amount?: number;
  discount_amount?: number;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'mobile_money';
  status: 'completed' | 'refunded' | 'cancelled';
  original_transaction_id?: string | null;
  notes?: string | null;
  item_count?: number;
  items?: TransactionLineItem[];
  transaction_date: string;
}

export interface ReturnPayload {
  shop_id?: number;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice?: number;
  }>;
  reason: string;
  original_transaction_id?: string;
  payment_method?: 'cash' | 'card' | 'mobile_money';
  is_defective?: boolean;
}

export interface ReturnResponse {
  transaction_id: string;
  shop_id: number;
  seller_id: number;
  total_amount: number;
  status: 'refunded';
  original_transaction_id?: string | null;
  reason: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    previousStock: number;
    newStock: number;
    restocked: boolean;
  }>;
}

export interface TransactionSummary {
  total_transactions: number;
  total_revenue: number;
  total_discount: number;
  total_subtotal: number;
}

/** The checkout endpoint returns this compact receipt payload. */
export interface CheckoutTransaction {
  transaction_id: string;
  shop_id: number;
  seller_id: number;
  subtotal_amount?: number;
  discount_amount?: number;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'mobile_money';
  status: 'completed';
  items_count: number;
  items: TransactionLineItem[];
}

export interface DailyReport {
  id?: number;
  shop_id: number;
  shop_name?: string;
  shop_code?: string;
  report_date: string;
  total_transactions: number;
  total_units_sold: number;
  revenue_generated: number;
  total_cost: number;
  net_profit: number;
  shrinkage_count: number;
  shrinkage_cost: number;
  compiled_at?: string;
}

export interface GlobalSummary {
  reporting_shops: number;
  total_transactions: number;
  total_units_sold: number;
  total_revenue: number;
  total_cost: number;
  total_net_profit: number;
  total_shrinkage_count: number;
  total_shrinkage_cost: number;
}

export interface TopProduct {
  product_id: string;
  name: string;
  category: string;
  price: number;
  stock_quantity: number;
  shop_name?: string;
  total_units_sold: number;
  total_revenue: number;
}

export interface ProductSoldReportItem {
  product_id: string;
  name: string;
  category: string;
  catalog_price: number;
  current_stock: number;
  shop_name?: string;
  currency_code?: string;
  currency_symbol?: string;
  total_quantity_sold: number;
  total_revenue: number;
  average_selling_price: number;
}

export interface ProductsSoldReportResponse {
  shop_id: number | null;
  start_date: string | null;
  end_date: string | null;
  summary: {
    distinct_products_sold: number;
    total_units_sold: number;
    total_revenue: number;
  };
  products: ProductSoldReportItem[];
}

export interface DailyReconciliation {
  shop_id: number;
  date: string;
  total_sales: number;
  transactions_count: number;
  total_items_sold: number;
  currency_code: string;
  currency_symbol: string;
  payment_breakdown: {
    cash: number;
    card: number;
    mobile_money: number;
  };
  transactions: Array<{
    id: string;
    total_amount: number;
    payment_method: string;
    time: string;
    items_count: number;
  }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  stack?: string;
}

export interface SubscriptionPlan {
  id: number;
  plan_code: string;
  name: string;
  description?: string | null;
  price_tzs: number;
  duration_days: number;
  max_shops: number;
  max_sellers: number;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionPayment {
  id: number;
  business_id: number;
  business_name?: string;
  business_code?: string;
  plan_id: number;
  plan_name?: string;
  plan_code?: string;
  amount: number;
  currency: string;
  duration_days: number;
  payment_method: string;
  payment_reference?: string | null;
  status: 'pending' | 'verified' | 'rejected';
  notes?: string | null;
  verified_by_user_id?: number | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  created_at: string;
}

export interface PaymentMethodConfig {
  id: number;
  name?: string;
  type?: string;
  channel_type: 'mobile_money' | 'bank_transfer' | 'cash';
  provider_name: string;
  account_name: string;
  account_number: string;
  instructions?: string;
  is_active: boolean;
}

export interface PlatformConfig {
  plans: SubscriptionPlan[];
  payment_methods: PaymentMethodConfig[];
  settings: {
    platform_name: string;
    support_phone: string;
    support_email: string;
    terms_and_conditions: string;
    privacy_policy: string;
    registration_instructions: string;
  };
}

export interface BusinessRegistrationPayload {
  business_name: string;
  currency_code?: string;
  currency_symbol?: string;
  currency_name?: string;
  plan_id?: number;
  admin_name: string;
  phone_number: string;
  email?: string;
  pin: string;
  terms_accepted: boolean;
  payment_method?: string;
  payment_reference?: string;
  payment_notes?: string;
}



