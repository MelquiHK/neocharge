import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { Package, FileText, Settings, BarChart3 } from 'lucide-react'
import { LogoutButton } from '@/components/logout-button'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  const adminUser = { ...authUser, ...profile }

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Panel de Administrador</h1>
              <p className="text-muted-foreground">Bienvenido, {adminUser?.username}</p>
            </div>
            <LogoutButton />
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
                  <Icon className="w-12 h-12 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">{section.title}</h2>
                  <p className="text-sm">{section.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
