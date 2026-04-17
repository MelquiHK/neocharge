'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signOutAction } from '@/lib/auth-actions'
import { Button } from '@/components/ui/button'
import { Menu, X, ShoppingCart, LogOut, Home } from 'lucide-react'

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const client = createClient()

    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await client.auth.getUser()

      if (authUser) {
        const { data: profile, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (!error && profile) {
          setUser({ ...authUser, ...profile })
        }
      }
      setLoading(false)
    }

    getUser()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await signOutAction()
  }

  const navLinks = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/products', label: 'Productos', icon: null },
    { href: '/blog', label: 'Blog', icon: null },
    { href: '/about', label: 'Informacion', icon: null },
  ]

  return (
    <header className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">
              NC
            </div>
            <span className="font-bold text-lg text-foreground hidden sm:block">Neocharge</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground hover:text-primary transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Cart Icon */}
            <Link
              href="/cart"
              className="relative p-2 hover:bg-primary/10 rounded-lg transition"
            >
              <ShoppingCart size={20} />
              <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-white text-xs rounded-full flex items-center justify-center">
                0
              </span>
            </Link>

            {/* Auth Actions */}
            {loading ? (
              <div className="w-10 h-10 bg-muted rounded-lg animate-pulse"></div>
            ) : user ? (
              <div className="hidden sm:flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs font-medium text-foreground">{user.username}</p>
                  {user.is_admin && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-accent font-semibold">Admin</p>
                      <Link href="/admin" className="text-xs text-primary hover:underline">
                        Panel Admin
                      </Link>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition text-destructive"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex gap-2">
                <Link href="/auth/login">
                  <Button variant="outline" size="sm">
                    Iniciar
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">Crear Cuenta</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 hover:bg-primary/10 rounded-lg transition"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <nav className="md:hidden mt-4 space-y-2 pb-4 border-t pt-4">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/10 rounded-lg transition"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t pt-4 mt-4 space-y-2">
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm">
                    <p className="font-medium text-foreground">{user.username}</p>
                    {user.is_admin && (
                      <p className="text-xs text-accent font-semibold">Admin</p>
                    )}
                  </div>
                  {user.is_admin && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/10 rounded-lg transition"
                      onClick={() => setIsOpen(false)}
                    >
                      Panel Admin
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition"
                  >
                    Cerrar Sesion
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="block px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/10 rounded-lg transition"
                    onClick={() => setIsOpen(false)}
                  >
                    Iniciar Sesion
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition"
                    onClick={() => setIsOpen(false)}
                  >
                    Crear Cuenta
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
