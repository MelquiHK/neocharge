'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Save, Upload } from 'lucide-react'
import { createBlogPostAction } from '@/lib/actions'
import Image from 'next/image'

export default function NewBlogPostPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    image_url: '',
    category_id: '',
    is_published: false,
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
      await createBlogPostAction(formData)
      router.push('/admin/blog')
    } catch (error) {
      console.error('Error creating blog post:', error)
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
      alert(`Error al crear el artículo: ${errorMsg}`)
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
            href="/admin/blog"
            className="flex items-center gap-2 text-primary hover:underline mb-4"
          >
            <ChevronLeft size={18} />
            Volver al Blog
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Crear Nuevo Artículo</h1>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Información del Artículo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Título *
                </label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ej: Guía de compra de teléfonos"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Slug (URL)
                </label>
                <Input
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="ej-guia-compra-telefonos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Extracto (resumen corto)
                </label>
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleChange}
                  placeholder="Breve descripción del artículo"
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Contenido *
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Escribe el contenido del artículo aquí..."
                  rows={8}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Media & Category */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Imagen y Categoría</h2>
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
                  <option value="guias">Guías</option>
                  <option value="noticias">Noticias</option>
                  <option value="tutoriales">Tutoriales</option>
                </select>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Estado</h2>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_published"
                checked={formData.is_published}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-foreground">Publicar Ahora</span>
            </label>
            <p className="text-xs text-muted-foreground mt-2">
              Si no seleccionas esto, el artículo quedará como borrador
            </p>
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
              {loading ? 'Guardando...' : 'Crear Artículo'}
            </Button>
            <Link href="/admin/blog">
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