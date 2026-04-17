'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Package, FileText, Settings, BarChart3, LogOut } from 'lucide-react'
import { signOutAction } from '@/lib/auth-actions'

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.push('/auth/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (!profile?.is_admin) {
          router.push('/')
          return
        }

        setUser({ ...authUser, ...profile })
      } catch (error) {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [])

  const handleLogout = async () => {
    await signOutAction()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  const adminSections = [
    {
      icon: Package,
      title: 'Productos',
      description: 'Gestiona el catalogo de productos',
      href: '/admin/products',
      color: 'bg-blue-50 border-blue-200 text-blue-900'
    },
    {
      icon: FileText,
      title: 'Blog',
      description: 'Escribe y publica articulos',
      href: '/admin/blog',
      color: 'bg-purple-50 border-purple-200 text-purple-900'
    },
    {
      icon: BarChart3,
      title: 'Pedidos',
      description: 'Gestiona los pedidos de clientes',
      href: '/admin/orders',
      color: 'bg-green-50 border-green-200 text-green-900'
    },
    {
      icon: Settings,
      title: 'Configuracion',
      description: 'Ajusta los parametros de la tienda',
      href: '/admin/settings',
      color: 'bg-orange-50 border-orange-200 text-orange-900'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Header */}
      <section className="border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Panel de Administrador</h1>
              <p className="text-muted-foreground">Bienvenido, {user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition"
            >
              <LogOut size={18} />
              Cerrar Sesion
            </button>
          </div>
        </div>
      </section>

      {/* Admin Sections */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
          {adminSections.map((section, i) => {
            const Icon = section.icon
            return (
              <Link key={i} href={section.href}>
                <div className={`h-full p-8 rounded-lg border-2 hover:shadow-lg transition cursor-pointer ${section.color}`}>
                  <Icon className="w-12 h-12 mb-4 opacity-80" />
                  <h2 className="text-2xl font-bold mb-2">{section.title}</h2>
                  <p className="text-sm opacity-80">{section.description}</p>
                  <div className="mt-6">
                    <span className="text-sm font-semibold opacity-60">Ir →</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="container mx-auto px-4 py-12 border-t">
        <h2 className="text-2xl font-bold text-foreground mb-8">Resumen Rapido</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { label: 'Total de Productos', value: '0', color: 'bg-blue-50 border-blue-200' },
            { label: 'Articulos de Blog', value: '0', color: 'bg-purple-50 border-purple-200' },
            { label: 'Pedidos Pendientes', value: '0', color: 'bg-orange-50 border-orange-200' },
            { label: 'Total de Clientes', value: '0', color: 'bg-green-50 border-green-200' }
          ].map((stat, i) => (
            <div key={i} className={`p-6 rounded-lg border ${stat.color}`}>
              <p className="text-sm font-medium opacity-80">{stat.label}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
