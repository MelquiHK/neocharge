import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit, Trash2, Plus, Search, ChevronLeft } from 'lucide-react'
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
            Volver
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Gestionar Productos</h1>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b sticky top-0 z-40 bg-white">
        <div className="container mx-auto px-4 py-4 flex gap-4 items-center justify-between">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg px-4">
            <Search size={18} className="text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent"
            />
          </div>
          <Link href="/admin/products/new">
            <Button className="gap-2">
              <Plus size={18} />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      {/* Products Table */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando productos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {products.length === 0 ? 'No hay productos aun' : 'No se encontraron resultados'}
            </p>
            {products.length === 0 && (
              <Link href="/admin/products/new">
                <Button>Crear primer producto</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Nombre</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Precio</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Stock</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Estado</th>
                  <th className="text-right py-4 px-4 font-semibold text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id} className="border-b hover:bg-muted/50 transition">
                    <td className="py-4 px-4">
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.id}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-primary">USD ${product.price.toFixed(2)}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {product.stock} unidades
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        product.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/products/${product.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit size={16} />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
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
