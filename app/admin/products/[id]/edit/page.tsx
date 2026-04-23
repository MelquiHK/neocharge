'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Save, Upload } from 'lucide-react'
import { updateProductAction } from '@/lib/actions'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface Product {
  id: string
  name: string
  slug: string
  description?: string
  specifications?: string
  price: number
  compare_price?: number
  category_id?: string
  image_url?: string
  stock: number
  is_active: boolean
  is_featured: boolean
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formData, setFormData] = useState<Product>({
    id: '',
    name: '',
    slug: '',
    description: '',
    specifications: '',
    price: 0,
    compare_price: undefined,
    category_id: '',
    stock: 0,
    is_active: true,
    is_featured: false,
    image_url: '',
  })

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()

        if (error) {
          throw new Error(`Producto no encontrado: ${error.message}`)
        }

        if (data) {
          setFormData(data)
          if (data.image_url) {
            setImagePreview(data.image_url)
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error al cargar producto'
        alert(`❌ Error: ${msg}`)
        router.push('/admin/products')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      // Mostrar preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Subir a Supabase Storage
      const formDataFile = new FormData()
      formDataFile.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataFile,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al subir la imagen')
      }

      const data = await response.json()
      if (!data.url) throw new Error('No se obtuvo URL de la imagen')
      setFormData(prev => ({
        ...prev,
        image_url: data.url,
      }))
    } catch (error) {
      console.error('Error uploading image:', error)
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido al subir imagen'
      alert(`Subida fallida: ${errorMsg}`)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      console.log('[handleSubmit] Enviando actualización:', formData)
      const result = await updateProductAction(formData.id, formData)
      console.log('[handleSubmit] Producto actualizado:', result)
      alert('✅ Producto actualizado exitosamente!')
      router.push('/admin/products')
    } catch (error) {
      console.error('[handleSubmit] Error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
      alert(`❌ Error al actualizar producto:\n\n${errorMsg}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
          <p className="text-muted-foreground">Cargando producto...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/products">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Editar Producto</h1>
              <p className="text-sm text-muted-foreground">{formData.name}</p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            <Save className="w-4 h-4" />
            {submitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          {/* Image Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Imagen del Producto</h2>
            {imagePreview && (
              <div className="mb-4 relative w-full h-64 bg-muted rounded-lg overflow-hidden">
                <Image
                  src={imagePreview}
                  alt={formData.name}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {uploadingImage ? 'Subiendo...' : 'Haz clic para cambiar la imagen'}
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
          </div>

          {/* Basic Info */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Información Básica</h2>

            <div>
              <label className="block text-sm font-medium mb-2">Nombre *</label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nombre del producto"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Slug</label>
              <Input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="nombre-del-producto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Descripción</label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                placeholder="Descripción detallada del producto"
                rows={4}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Especificaciones</label>
              <textarea
                name="specifications"
                value={formData.specifications || ''}
                onChange={handleChange}
                placeholder="Especificaciones técnicas (JSON o texto)"
                rows={4}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Precios e Inventario</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Precio *</label>
                <Input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="99.99"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Precio Comparativo</label>
                <Input
                  type="number"
                  name="compare_price"
                  value={formData.compare_price || ''}
                  onChange={handleChange}
                  placeholder="129.99"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Stock *</label>
              <Input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="10"
                required
              />
            </div>
          </div>

          {/* Settings */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Configuración</h2>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Activo</label>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4 rounded border-border"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Destacado</label>
              <input
                type="checkbox"
                name="is_featured"
                checked={formData.is_featured}
                onChange={handleChange}
                className="w-4 h-4 rounded border-border"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={submitting} className="flex-1" size="lg">
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <Link href="/admin/products" className="flex-1">
              <Button type="button" variant="outline" size="lg" className="w-full">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
