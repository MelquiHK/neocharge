import { Database } from "@/integrations/supabase/types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export type Product = Tables<"products"> & {
  sort_order?: number | null;
};
export type Category = Tables<"categories">;
export type Order = Tables<"orders">;
export type StoreLocation = Tables<"store_locations">;
export type Profile = Tables<"profiles">;
export type AdminPermission = Tables<"admin_permissions">;
export type BlogPost = Tables<"blog_posts">;
export type BlogCategory = Tables<"blog_categories">;
export type ExchangeRate = Tables<"exchange_rates">;

export type UserRole = "admin" | "owner" | "gestor" | "mensajero" | "cliente" | "user";

export interface MessengerProfile {
  user_id: string;
  rate_per_km: number;
  vehicle_type: string;
  is_active: boolean;
  updated_at: string;
}

export interface SalePoint {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  is_active: boolean;
  created_at: string;
}

export interface PaymentRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected" | "paid";
  notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export type ServiceType = "purchase" | "request";

export interface Service {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  category?: string | null;
  service_type?: ServiceType | null;
  features?: string[] | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface SiteSettings {
  id?: string;
  setting_key: string;
  warranty_intro?: string | null;
  warranty_chargers_title?: string | null;
  warranty_chargers_text?: string | null;
  warranty_electronics_title?: string | null;
  warranty_electronics_text?: string | null;
  warranty_important_title?: string | null;
  warranty_important_text?: string | null;
  warranty_support_title?: string | null;
  warranty_support_text?: string | null;
  whatsapp_url?: string | null;
  contact_url?: string | null;
  support_phone?: string | null;
  support_email?: string | null;
  support_address?: string | null;
  support_hours?: string | null;
  locations_intro?: string | null;
}

export type OrderStatus = Enums<"order_status">;

export interface AdminPermissions {
  is_owner: boolean;
  can_manage_products: boolean;
  can_manage_orders: boolean;
  can_manage_customers: boolean;
  can_manage_locations: boolean;
  can_manage_blog: boolean;
  can_manage_rates: boolean;
  can_view_finances: boolean;
  can_manage_admins: boolean;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export const NO_PERMS: AdminPermissions = {
  is_owner: false,
  can_manage_products: false,
  can_manage_orders: false,
  can_manage_customers: false,
  can_manage_locations: false,
  can_manage_blog: false,
  can_manage_rates: false,
  can_view_finances: false,
  can_manage_admins: false,
};
