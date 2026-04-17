import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminProductsClient } from '@/components/admin-products-client'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  category_id: string
  is_active: boolean
  created_at: string
}

export default async function AdminProductsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  return <AdminProductsClient initialProducts={products || []} />
}
