import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminOrdersClient } from '@/components/admin-orders-client'

export default async function AdminOrdersPage() {
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

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  return <AdminOrdersClient initialOrders={orders || []} />
}