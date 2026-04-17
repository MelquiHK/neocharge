'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, ChevronLeft } from 'lucide-react'
import { deleteBlogPostAction } from '@/lib/actions'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  image_url: string
  is_published: boolean
  created_at: string
}

interface AdminBlogClientProps {
  initialPosts: BlogPost[]
}

export function AdminBlogClient({ initialPosts }: AdminBlogClientProps) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este artículo?')) return

    try {
      await deleteBlogPostAction(id)
      setPosts(posts.filter(p => p.id !== id))
    } catch (error) {
      console.error('Error deleting blog post:', error)
      alert('Error al eliminar el artículo')
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
          <h1 className="text-3xl font-bold text-foreground">Gestionar Blog</h1>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b sticky top-0 z-40 bg-white">
        <div className="container mx-auto px-4 py-4 flex gap-4 items-center justify-between">
          <div className="flex-1 text-muted-foreground">
            <p className="text-sm">Total de artículos: {posts.length}</p>
          </div>
          <Link href="/admin/blog/new">
            <Button className="flex items-center gap-2">
              <Plus size={18} />
              Nuevo Artículo
            </Button>
          </Link>
        </div>
      </div>

      {/* Blog Posts List */}
      <div className="container mx-auto px-4 py-8">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No hay artículos</p>
            <Link href="/admin/blog/new">
              <Button>Crear Primer Artículo</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{post.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(post.created_at).toLocaleDateString('es-ES')}
                    {post.is_published ? ' • Publicado' : ' • Borrador'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/blog/${post.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit size={16} />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(post.id)}
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