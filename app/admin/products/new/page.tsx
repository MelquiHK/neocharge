'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Save, Upload } from 'lucide-react'
import { createProductAction } from '@/lib/actions'
import Image from 'next/image'

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    specifications: '',
    price: '',
    compare_price: '',
    category_id: '',
    stock: '0',
    is_active: true,
    is_featured: false,
    image_url: '',
  })

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
    setLoading(true)

    try {
      console.log('[handleSubmit] Enviando producto:', formData)
      const result = await createProductAction(formData)
      console.log('[handleSubmit] Producto creado:', result)
      alert('✅ Producto creado exitosamente!')
      router.push('/admin/products')
    } catch (error) {
      console.error('[handleSubmit] Error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
      alert(`❌ Error al crear producto:\n\n${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/admin/products"
            className="flex items-center gap-2 text-primary hover:underline mb-4"
          >
            <ChevronLeft size={18} />
            Volver a Productos
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Crear Nuevo Producto</h1>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Información Básica</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre del Producto *
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej: iPhone 15 Pro"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Slug (URL) *
                </label>
                <Input
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="ej-iphone-15-pro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Descripción del producto"
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Especificaciones
                </label>
                <textarea
                  name="specifications"
                  value={formData.specifications}
                  onChange={handleChange}
                  placeholder="Especificaciones técnicas"
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Imagen del Producto</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Subir Imagen
                </label>
                <div className="flex gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
                  />
                  {uploadingImage && <span className="text-sm text-muted-foreground">Subiendo...</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG, WebP (máx. 5MB)
                </p>
              </div>

              {imagePreview && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  O pegue una URL de imagen
                </label>
                <Input
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  type="url"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Precios</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Precio (USD) *
                </label>
                <Input
                  name="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Precio de Comparación (USD)
                </label>
                <Input
                  name="compare_price"
                  type="number"
                  step="0.01"
                  value={formData.compare_price}
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Inventario</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Stock *
                </label>
                <Input
                  name="stock"
                  type="number"
                  value={formData.stock}
                  onChange={handleChange}
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Categoría
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                >
                  <option value="">Sin Categoría</option>
                  <option value="electronics">Electrónica</option>
                  <option value="phones">Teléfonos</option>
                  <option value="accessories">Accesorios</option>
                </select>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Estado</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-foreground">Producto Activo</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-foreground">Destacado</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="gap-2"
            >
              <Save size={18} />
              {loading ? 'Guardando...' : 'Crear Producto'}
            </Button>
            <Link href="/admin/products">
              <Button size="lg" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}