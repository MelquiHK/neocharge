'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Save } from 'lucide-react'
import { createBlogPostAction } from '@/lib/actions'

export default function NewBlogPostPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createBlogPostAction(formData)
      router.push('/admin/blog')
    } catch (error) {
      console.error('Error creating blog post:', error)
      alert('Error al crear el artículo')
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
                  URL de la Imagen
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