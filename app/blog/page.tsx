'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MessageCircle } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  image_url: string
  category_id: string
  created_at: string
}

interface BlogCategory {
  id: string
  name: string
  slug: string
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const { data: categoriesData } = await supabase
          .from('blog_categories')
          .select('*')

        if (categoriesData) {
          setCategories(categoriesData)
        }

        // Fetch posts
        const { data: postsData } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        if (postsData) {
          setPosts(postsData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category_id === selectedCategory
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleNoResults = () => {
    const phone = '+5363180910'
    const message = `No encontre una solucion para: ${searchQuery}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Header */}
      <section className="border-b">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Blog de Neocharge</h1>
          <p className="text-muted-foreground">Novedades, soluciones y articulos utiles para nuestros clientes</p>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="border-b bg-white sticky top-20 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-2 bg-muted rounded-lg px-4">
              <Search size={20} className="text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar articulos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 bg-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                Todos
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="grid md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-4 animate-pulse">
                <div className="aspect-video bg-muted rounded-lg"></div>
                <div className="h-6 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {filteredPosts.map(post => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <div className="group cursor-pointer space-y-3 h-full flex flex-col">
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border group-hover:border-primary transition">
                      {post.image_url ? (
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-muted-foreground">Sin imagen</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {post.excerpt}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(post.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">No encontramos articulos sobre &quot;{searchQuery}&quot;</p>
            <Button
              onClick={handleNoResults}
              variant="outline"
              className="gap-2"
            >
              <MessageCircle size={18} />
              Contactanos por WhatsApp
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
