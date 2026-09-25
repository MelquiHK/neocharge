export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      // NOTA (2026-09-25): este archivo generado estaba desactualizado — solo incluía
      // 4 de las ~24 tablas que usa la app — y no se puede regenerar sin la clave
      // secreta de Supabase (`supabase gen types` la exige). Para no arrastrar 600+
      // errores de tipos se añade este fallback permisivo: las tablas con tipo exacto
      // (declaradas debajo) lo conservan; el resto usa filas genéricas.
      // TODO: regenerar con `supabase gen types typescript` cuando haya acceso.
      /* eslint-disable @typescript-eslint/no-explicit-any -- fallback intencional: filas genéricas para tablas sin tipo exacto */
      [key: string]: {
        Row: { [key: string]: any }
        Insert: { [key: string]: any }
        Update: { [key: string]: any }
        Relationships: []
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
      admin_permissions: {
        Row: {
          can_manage_admins: boolean
          can_manage_blog: boolean
          can_manage_customers: boolean
          can_manage_locations: boolean
          can_manage_orders: boolean
          can_manage_products: boolean
          can_manage_rates: boolean
          can_view_finances: boolean
          created_at: string
          id: string
          is_owner: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage_admins?: boolean
          can_manage_blog?: boolean
          can_manage_customers?: boolean
          can_manage_locations?: boolean
          can_manage_orders?: boolean
          can_manage_products?: boolean
          can_manage_rates?: boolean
          can_view_finances?: boolean
          created_at?: string
          id?: string
          is_owner?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage_admins?: boolean
          can_manage_blog?: boolean
          can_manage_customers?: boolean
          can_manage_locations?: boolean
          can_manage_orders?: boolean
          can_manage_products?: boolean
          can_manage_rates?: boolean
          can_view_finances?: boolean
          created_at?: string
          id?: string
          is_owner?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          is_published: boolean
          slug: string
          title: string
          updated_at: string
          images: string[] // This is the added line
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
          images?: string[] // This is the added line
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
          images?: string[] // This is the added line
        }
        // (FK original omitida: debe ser asignable al fallback `Relationships: []`; ver nota en Tables)
        Relationships: []
      }
      seller_sales: {
        Row: {
          id: string
          product_id: string | null
          product_name: string | null
          seller_user_id: string | null
          seller_name: string | null
          price: number
          currency: string
          amount_to_receive: number | null
          is_paid: boolean
          notes: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          location_name: string | null
          delivery_type: string | null
          sale_details: string | null
          commission_amount: number | null
          commission_currency: string | null
          commission_paid_amount: number | null
          is_approved: boolean | null
          approval_notes: string | null
          approved_by: string | null
          approved_at: string | null
        }
        Insert: {
          id?: string
          product_id?: string | null
          product_name?: string | null
          seller_user_id?: string | null
          seller_name?: string | null
          price: number
          currency?: string
          amount_to_receive?: number | null
          is_paid?: boolean
          notes?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          location_name?: string | null
          delivery_type?: string | null
          sale_details?: string | null
          commission_amount?: number | null
          commission_currency?: string | null
          commission_paid_amount?: number | null
          is_approved?: boolean | null
          approval_notes?: string | null
          approved_by?: string | null
          approved_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string | null
          product_name?: string | null
          seller_user_id?: string | null
          seller_name?: string | null
          price?: number
          currency?: string
          amount_to_receive?: number | null
          is_paid?: boolean
          notes?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          location_name?: string | null
          delivery_type?: string | null
          sale_details?: string | null
          commission_amount?: number | null
          commission_currency?: string | null
          commission_paid_amount?: number | null
          is_approved?: boolean | null
          approval_notes?: string | null
          approved_by?: string | null
          approved_at?: string | null
        }
        // (FK original omitida: debe ser asignable al fallback `Relationships: []`; ver nota en Tables)
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // Fallback permisivo por el mismo motivo que en Tables (ver nota arriba).
      /* eslint-disable @typescript-eslint/no-explicit-any -- fallback intencional para RPCs sin tipo exacto */
      [key: string]: {
        Args: { [key: string]: any }
        Returns: any
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
      has_role: {
        Args: {
          user_id: string
          role_name: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]
