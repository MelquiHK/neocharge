'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Save } from 'lucide-react'
import { updateOrderStatusAction, updateOrderNotesAction } from '@/lib/actions'

interface Order {
  id: string
  customer_name: string | null
  customer_phone: string | null
  total_amount: number
  status: string
  admin_notes: string | null
  created_at: string
}

interface AdminOrdersClientProps {
  initialOrders: Order[]
}

export function AdminOrdersClient({ initialOrders }: AdminOrdersClientProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [notes, setNotes] = useState('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-900'
      case 'confirmed':
        return 'bg-blue-100 text-blue-900'
      case 'preparing':
        return 'bg-purple-100 text-purple-900'
      case 'shipped':
        return 'bg-indigo-100 text-indigo-900'
      case 'delivered':
        return 'bg-green-100 text-green-900'
      case 'cancelled':
        return 'bg-red-100 text-red-900'
      default:
        return 'bg-gray-100 text-gray-900'
    }
  }

  const handleStatusChange = async (orderId: string) => {
    if (!newStatus) return
    try {
      await updateOrderStatusAction(orderId, newStatus)
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      setNewStatus('')
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Error al actualizar estado')
    }
  }

  const handleSaveNotes = async (orderId: string) => {
    try {
      await updateOrderNotesAction(orderId, notes)
      setOrders(orders.map(o => o.id === orderId ? { ...o, admin_notes: notes } : o))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, admin_notes: notes })
      }
    } catch (error) {
      console.error('Error updating notes:', error)
      alert('Error al guardar notas')
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

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No hay pedidos</p>
          </div>
        ) : !selectedOrder ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Total de pedidos: {orders.length}</p>
            {orders.map((order) => (
              <div
                key={order.id}
                className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition"
                onClick={() => { setSelectedOrder(order); setNotes(order.admin_notes || '') }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{order.customer_name || 'Sin nombre'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('es-ES')} • USD ${order.total_amount.toFixed(2)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl">
            <button
              onClick={() => { setSelectedOrder(null); setNewStatus(''); setNotes('') }}
              className="flex items-center gap-2 text-primary hover:underline mb-6"
            >
              <ChevronLeft size={18} />
              Volver a Pedidos
            </button>

            <div className="border rounded-lg p-6 space-y-6">
              {/* Order Info */}
              <div className="border-b pb-6">
                <h2 className="text-2xl font-bold mb-4">{selectedOrder.customer_name || 'Sin nombre'}</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-semibold">{selectedOrder.customer_phone || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-semibold">USD ${selectedOrder.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha</p>
                    <p className="font-semibold">{new Date(selectedOrder.created_at).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID Pedido</p>
                    <p className="font-mono text-sm">{selectedOrder.id}</p>
                  </div>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <h3 className="font-semibold mb-4">Cambiar Estado</h3>
                <div className="flex gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg"
                  >
                    <option value="">Seleccionar nuevo estado</option>
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="preparing">Preparando</option>
                    <option value="shipped">Enviado</option>
                    <option value="delivered">Entregado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                  <Button
                    onClick={() => handleStatusChange(selectedOrder.id)}
                    disabled={!newStatus}
                  >
                    Actualizar
                  </Button>
                </div>
                <span className={`inline-block mt-4 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.status)}`}>
                  Estado actual: {selectedOrder.status}
                </span>
              </div>

              {/* Admin Notes */}
              <div>
                <h3 className="font-semibold mb-4">Notas Internas</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agrega notas sobre este pedido..."
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
                <Button
                  onClick={() => handleSaveNotes(selectedOrder.id)}
                  className="mt-4 gap-2"
                >
                  <Save size={16} />
                  Guardar Notas
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}