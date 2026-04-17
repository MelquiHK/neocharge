'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit, Trash2, Plus, Search, ChevronLeft } from 'lucide-react'
import { deleteProductAction } from '@/lib/actions'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  category_id: string
  is_active: boolean
  created_at: string
}

interface AdminProductsClientProps {
  initialProducts: Product[]
}

export function AdminProductsClient({ initialProducts }: AdminProductsClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [searchQuery, setSearchQuery] = useState('')

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return

    try {
      await deleteProductAction(id)
      setProducts(products.filter(p => p.id !== id))
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error al eliminar el producto')
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            <Button className="flex items-center gap-2">
              <Plus size={18} />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      {/* Products List */}
      <div className="container mx-auto px-4 py-8">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No se encontraron productos</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    ${product.price} • Stock: {product.stock}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/products/${product.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit size={16} />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}