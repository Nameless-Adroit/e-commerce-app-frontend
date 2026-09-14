export type Role = 'super_admin' | 'admin' | 'seller';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  shop_id: number | null;
  shop_name?: string | null;
  shop_code?: string | null;
}

export interface Shop {
  id: number;
  shop_code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  is_active?: boolean;
  staff_count?: number;
  product_count?: number;
  total_units_in_stock?: number;
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
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
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
  id: string; // TXN-SHP01-YYYYMMDD-XXXX
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
  notes?: string | null;
  item_count?: number;
  items?: TransactionLineItem[];
  transaction_date: string;
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

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  stack?: string;
}
