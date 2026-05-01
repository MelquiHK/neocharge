export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  images: string[];
  main_image_index: number;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  currency?: string | null;
  price_cup?: number | null;
  extra_cup_per_usd?: number | null;
  warranty_type?: string | null;
  description?: string | null;
  specifications?: string | null;
  category_id?: string | null;
  cost_price?: number | null;
  low_stock_threshold?: number | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
}

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  location_type: string;
  map_link: string | null;
  hours: string | null;
  is_active: boolean;
  sort_order: number;
}

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

