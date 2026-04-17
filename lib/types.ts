export interface Profile {
  id: string
  username: string
  phone: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sort_order: number
  created_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  specifications: string | null
  price: number
  compare_price: number | null
  category_id: string | null
  category?: Category
  images: string[]
  main_image_index: number
  stock: number
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface OrderItem {
  product_id: string
  product_name: string
  product_image: string
  price: number
  quantity: number
}

export interface Order {
  id: string
  user_id: string | null
  customer_name: string
  customer_phone: string
  customer_address: string | null
  location_lat: number | null
  location_lng: number | null
  location_link: string | null
  delivery_method: 'pickup' | 'delivery'
  pickup_location: string | null
  items: OrderItem[]
  subtotal: number
  delivery_fee: number
  total: number
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface BlogCategory {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string | null
  excerpt: string | null
  image_url: string | null
  category_id: string | null
  category?: BlogCategory
  is_published: boolean
  author_id: string | null
  created_at: string
  updated_at: string
}

export interface StoreInfo {
  name: string
  phone: string
  whatsapp: string
  address: string
  hours: string
  facebook: string
}

export interface AboutPage {
  warranty_text: string
  return_policy: string
  delivery_info: string
}

export interface CartItem {
  product: Product
  quantity: number
}
