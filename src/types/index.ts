import { Database } from "@/integrations/supabase/types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export type Product = Tables<"products">;
export type Category = Tables<"categories">;
export type Order = Tables<"orders">;
export type StoreLocation = Tables<"store_locations">;
export type Profile = Tables<"profiles">;
export type AdminPermission = Tables<"admin_permissions">;
export type BlogPost = Tables<"blog_posts">;
export type BlogCategory = Tables<"blog_categories">;
export type ExchangeRate = Tables<"exchange_rates">;

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
