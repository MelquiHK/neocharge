import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Search, ChevronLeft } from 'lucide-react'

export default async function AdminBlogPage() {
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

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })

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
            <p className="text-sm">Total de artículos: {posts?.length || 0}</p>
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
        {!posts || posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No hay artículos publicados</p>
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