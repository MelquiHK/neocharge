'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { ChevronLeft, MessageCircle } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  image_url: string
  category_id: string
  created_at: string
  author: string
}

export default function BlogPostPage() {
  const params = useParams()
  const slug = params.slug as string
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPost = async () => {
      const supabase = createClient()
      try {
        const { data } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single()

        if (data) {
          setPost(data)
        }
      } catch (error) {
        console.error('Error fetching post:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [slug])

  const handleWhatsApp = () => {
    const phone = '+5363180910'
    const message = `Tengo una pregunta sobre el articulo: ${post?.title}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6 max-w-2xl">
            <div className="h-96 bg-muted rounded-lg"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">Articulo no encontrado</p>
          <Link href="/blog">
            <Button>Volver al Blog</Button>
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
        <Link href="/blog" className="flex items-center gap-2 text-primary hover:underline">
          <ChevronLeft size={18} />
          Volver al Blog
        </Link>
      </div>

      {/* Article */}
      <article className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <div className="space-y-6 mb-12">
          {post.image_url && (
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full aspect-video object-cover rounded-lg border border-border"
            />
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{new Date(post.created_at).toLocaleDateString('es-ES')}</span>
              {post.author && (
                <>
                  <span>•</span>
                  <span>Por {post.author}</span>
                </>
              )}
            </div>

            <h1 className="text-4xl font-bold text-foreground">{post.title}</h1>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none mb-12">
          {post.content.split('\n\n').map((paragraph, i) => {
            // Check if it's a heading
            if (paragraph.startsWith('#')) {
              const match = paragraph.match(/#*/)
              const level = match ? match[0].length : 1
              const text = paragraph.replace(/#\s+/, '')
              const headingClass = level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : 'text-lg'
              
              if (level === 1) return <h1 key={i} className={`${headingClass} font-bold text-foreground mt-8 mb-4`}>{text}</h1>
              if (level === 2) return <h2 key={i} className={`${headingClass} font-bold text-foreground mt-8 mb-4`}>{text}</h2>
              if (level === 3) return <h3 key={i} className={`${headingClass} font-bold text-foreground mt-8 mb-4`}>{text}</h3>
              if (level === 4) return <h4 key={i} className={`${headingClass} font-bold text-foreground mt-8 mb-4`}>{text}</h4>
              if (level === 5) return <h5 key={i} className={`${headingClass} font-bold text-foreground mt-8 mb-4`}>{text}</h5>
              return <h6 key={i} className={`${headingClass} font-bold text-foreground mt-8 mb-4`}>{text}</h6>
            }

            // Check if it's a list
            if (paragraph.startsWith('-') || paragraph.startsWith('•')) {
              const items = paragraph.split('\n').filter(line => line.trim())
              return (
                <ul key={i} className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  {items.map((item, idx) => (
                    <li key={idx}>{item.replace(/^[-•]\s+/, '')}</li>
                  ))}
                </ul>
              )
            }

            // Regular paragraph
            return (
              <p key={i} className="text-muted-foreground leading-relaxed mb-4">
                {paragraph}
              </p>
            )
          })}
        </div>

        {/* CTA */}
        <div className="border-t pt-8 flex gap-4">
          <Button onClick={handleWhatsApp} className="gap-2">
            <MessageCircle size={18} />
            Preguntanos por WhatsApp
          </Button>
          <Link href="/products">
            <Button variant="outline">Ver Productos</Button>
          </Link>
        </div>
      </article>
    </div>
  )
}
