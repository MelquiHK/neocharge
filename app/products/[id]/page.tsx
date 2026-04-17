'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ShoppingCart, Minus, Plus } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  description: string
  specifications: string
  images: string[]
  main_image_index: number
  stock: number
}

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()

        if (data) {
          setProduct(data)
          setSelectedImage(data.main_image_index || 0)
        }
      } catch (error) {
        console.error('Error fetching product:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleAddToCart = () => {
    // TODO: Add to cart logic
    console.log(`Added ${quantity} x ${product?.name} to cart`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-96 bg-muted rounded-lg"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">Producto no encontrado</p>
          <Link href="/products">
            <Button>Volver a Productos</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4 border-b">
        <Link href="/products" className="flex items-center gap-2 text-primary hover:underline">
          <ChevronLeft size={18} />
          Volver a Productos
        </Link>
      </div>

      {/* Product Detail */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden border border-border">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground">Sin imagen</span>
                </div>
              )}
            </div>

            {/* Image Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`aspect-square rounded-lg border-2 overflow-hidden transition ${
                      selectedImage === i
                        ? 'border-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img src={image} alt={`${product.name} ${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">{product.name}</h1>
              <p className="text-3xl font-bold text-primary">USD ${product.price.toFixed(2)}</p>
              {product.stock > 0 ? (
                <p className="text-sm text-green-600 mt-2">En stock: {product.stock} disponibles</p>
              ) : (
                <p className="text-sm text-destructive mt-2">Sin stock</p>
              )}
            </div>

            {product.description && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Descripcion</h3>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}

            {product.specifications && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Especificaciones</h3>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {product.specifications}
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground">Cantidad:</span>
                <div className="flex items-center border border-border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-muted transition"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="px-6 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-muted transition"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <Button
                size="lg"
                disabled={product.stock === 0}
                onClick={handleAddToCart}
                className="w-full gap-2"
              >
                <ShoppingCart size={20} />
                Agregar al Carrito
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
