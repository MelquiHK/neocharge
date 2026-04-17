import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Eye, ChevronLeft } from 'lucide-react'

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-900'
      case 'confirmed':
        return 'bg-blue-50 text-blue-900'
      case 'preparing':
        return 'bg-purple-50 text-purple-900'
      case 'shipped':
        return 'bg-indigo-50 text-indigo-900'
      case 'delivered':
        return 'bg-green-50 text-green-900'
      case 'cancelled':
        return 'bg-red-50 text-red-900'
      default:
        return 'bg-gray-50 text-gray-900'
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-primary hover:underline mb-4"
          >
            <ChevronLeft size={18} />
            Volver al Panel
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Gestionar Pedidos</h1>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b sticky top-0 z-40 bg-white">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground">Total de pedidos: {orders?.length || 0}</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="container mx-auto px-4 py-8">
        {!orders || orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No hay pedidos</p>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">ID</th>
                  <th className="text-left px-4 py-3 font-semibold">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold">Total</th>
                  <th className="text-left px-4 py-3 font-semibold">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-mono">{order.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-sm">{order.customer_name || 'Sin nombre'}</td>
                    <td className="px-4 py-3 text-sm font-semibold">USD ${(order.total_amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(order.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye size={16} />
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}