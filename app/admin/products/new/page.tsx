'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Save, Upload, X } from 'lucide-react'
import { createProductAction } from '@/lib/actions'

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [images, setImages] = useState<string[]>([])
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
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    if (imagePreview.length + files.length > 5) {
      alert('Máximo 5 imágenes permitidas')
      return
    }

    setUploadingImage(true)
    try {
      const newImages: string[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        const reader = new FileReader()
        reader.onloadend = () => {
          setImagePreview(prev => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)

        const formDataFile = new FormData()
        formDataFile.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formDataFile,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al subir')
        }

        const data = await response.json()
        if (!data.url) throw new Error('No URL')
        newImages.push(data.url)
      }

      setImages(prev => [...prev, ...newImages])
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error'
      alert(`Fallo: ${msg}`)
      setImagePreview([])
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreview(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (images.length === 0) {
        alert('Sube al menos una imagen')
        setLoading(false)
        return
      }

      const result = await createProductAction({
        ...formData,
        images,
        image_url: images[0],
        main_image_index: 0,
      })
      alert('✅ Producto creado!')
      router.push('/admin/products')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error'
      alert(`❌ ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
        <div className="container mx-auto px-4 py-6">
          <Link href="/admin/products" className="flex items-center gap-2 text-primary hover:underline mb-4">
            <ChevronLeft size={18} />
            Volver
          </Link>
          <h1 className="text-3xl font-bold">Crear Producto</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Imágenes */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Imágenes (1-5)</h2>

            {imagePreview.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {imagePreview.map((preview, idx) => (
                  <div key={idx} className="relative group">
                    <img src={preview} alt={`${idx}`} className="w-full h-32 object-cover rounded-lg border" />
                    <button onClick={() => removeImage(idx)} type="button" className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100">
                      <X size={16} />
                    </button>
                    {idx === 0 && <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">Principal</div>}
                  </div>
                ))}
              </div>
            )}

            {imagePreview.length < 5 && (
              <label className="block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{uploadingImage ? 'Subiendo...' : 'Selecciona'} - {imagePreview.length}/5</p>
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} multiple className="hidden" />
              </label>
            )}
          </div>

          {/* Info */}
          <div className="border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Información</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Nombre *</label>
              <Input name="name" value={formData.name} onChange={handleChange} placeholder="Nombre" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Slug</label>
              <Input name="slug" value={formData.slug} onChange={handleChange} placeholder="slug" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Descripción</label>
              <textarea name="description" value={formData.description} onChange={handleChange} placeholder="..." rows={3} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Especificaciones</label>
              <textarea name="specifications" value={formData.specifications} onChange={handleChange} placeholder="..." rows={3} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
          </div>

          {/* Precios */}
          <div className="border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Precios</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Precio *</label>
                <Input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="99.99" step="0.01" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Comparativo</label>
                <Input type="number" name="compare_price" value={formData.compare_price} onChange={handleChange} placeholder="129.99" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stock *</label>
                <Input type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="10" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Categoría</label>
                <Input name="category_id" value={formData.category_id} onChange={handleChange} placeholder="ID" />
              </div>
            </div>
          </div>

          {/* Configuración */}
          <div className="border border-border rounded-lg p-6 space-y-3">
            <h2 className="text-lg font-semibold mb-4">Configuración</h2>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="w-4 h-4" />
              <span>Activo</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleChange} className="w-4 h-4" />
              <span>Destacado</span>
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1 gap-2" size="lg">
              <Save size={18} />
              {loading ? 'Creando...' : 'Crear'}
            </Button>
            <Link href="/admin/products" className="flex-1">
              <Button type="button" variant="outline" size="lg" className="w-full">Cancelar</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
