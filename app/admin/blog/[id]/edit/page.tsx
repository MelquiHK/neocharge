'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Save, Upload } from 'lucide-react'
import { updateBlogPostAction } from '@/lib/actions'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  content: string
  image_url?: string
  category_id?: string
  is_published: boolean
}

export default function EditBlogPostPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formData, setFormData] = useState<BlogPost>({
    id: '',
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category_id: '',
    is_published: false,
    image_url: '',
  })

  // Fetch blog post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', postId)
          .single()

        if (error) {
          throw new Error(`Artículo no encontrado: ${error.message}`)
        }

        if (data) {
          setFormData(data)
          if (data.image_url) {
            setImagePreview(data.image_url)
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error al cargar artículo'
        alert(`❌ Error: ${msg}`)
        router.push('/admin/blog')
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId, router])

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
      const result = await updateBlogPostAction(formData.id, formData)
      console.log('[handleSubmit] Artículo actualizado:', result)
      alert('✅ Artículo actualizado exitosamente!')
      router.push('/admin/blog')
    } catch (error) {
      console.error('[handleSubmit] Error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
      alert(`❌ Error al actualizar artículo:\n\n${errorMsg}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
          <p className="text-muted-foreground">Cargando artículo...</p>
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
            <Link href="/admin/blog">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Editar Artículo</h1>
              <p className="text-sm text-muted-foreground">{formData.title}</p>
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
            <h2 className="text-lg font-semibold mb-4">Imagen Destacada</h2>
            {imagePreview && (
              <div className="mb-4 relative w-full h-64 bg-muted rounded-lg overflow-hidden">
                <Image
                  src={imagePreview}
                  alt={formData.title}
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
              <label className="block text-sm font-medium mb-2">Título *</label>
              <Input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Título del artículo"
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
                placeholder="titulo-del-articulo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Extracto</label>
              <textarea
                name="excerpt"
                value={formData.excerpt || ''}
                onChange={handleChange}
                placeholder="Resumen breve del artículo"
                rows={2}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contenido *</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Contenido completo del artículo (soporta Markdown)"
                rows={12}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              />
            </div>
          </div>

          {/* Settings */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Configuración</h2>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Publicado</label>
              <input
                type="checkbox"
                name="is_published"
                checked={formData.is_published}
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
            <Link href="/admin/blog" className="flex-1">
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
