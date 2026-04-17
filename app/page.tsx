'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Zap, Users, Award } from 'lucide-react'
import { Header } from '@/components/header'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-accent rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000"></div>
        </div>

        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-block px-4 py-1 bg-primary/10 border border-primary/20 rounded-full">
                  <span className="text-sm font-semibold text-primary">Bienvenido a Neocharge</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                  Tu tienda de electronica de confianza
                </h1>
                <p className="text-lg text-muted-foreground">
                  Productos de calidad, servicio profesional y atencion 24 horas en La Habana
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/products">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    <ShoppingBag size={20} />
                    Ver Productos
                  </Button>
                </Link>
                <Link href="/about">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Mas Informacion
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t">
                <div>
                  <p className="text-2xl font-bold text-primary">24/7</p>
                  <p className="text-sm text-muted-foreground">Atencion</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">100+</p>
                  <p className="text-sm text-muted-foreground">Productos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">La Habana</p>
                  <p className="text-sm text-muted-foreground">Delivery</p>
                </div>
              </div>
            </div>

            {/* Right - Animated Hero Image */}
            <div className="flex items-center justify-center">
              <div className="relative w-full h-96 flex items-center justify-center">
                {/* Animated background circles */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute w-64 h-64 bg-primary/10 rounded-full animate-pulse"></div>
                  <div className="absolute w-48 h-48 bg-accent/20 rounded-full animate-pulse delay-1000"></div>
                </div>

                {/* Main content */}
                <div className="relative z-10 text-center space-y-6">
                  <div className="inline-block p-6 bg-white rounded-2xl shadow-lg border border-border">
                    <Zap className="w-16 h-16 text-primary mx-auto" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">Neocharge</h2>
                  <p className="text-muted-foreground font-medium">Tecnologia y calidad en cada producto</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Por que elegir Neocharge</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Somos tu mejor opcion para productos electronicos de calidad
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Award,
                title: 'Productos Certificados',
                description: 'Todos nuestros productos pasan control de calidad riguroso'
              },
              {
                icon: Zap,
                title: 'Garantia Completa',
                description: 'Soporte tecnico y garantia sobre todos nuestros productos'
              },
              {
                icon: Users,
                title: 'Atencion Personalizada',
                description: 'Equipo experto disponible 24/7 para ayudarte'
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg transition">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-accent/10 border-t">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Encuentra lo que necesitas</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explora nuestro catalogo completo de productos electronicos
          </p>
          <Link href="/products">
            <Button size="lg" className="gap-2">
              <ShoppingBag size={20} />
              Explorar Catalogo
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <h3 className="font-bold text-foreground">Neocharge</h3>
              <p className="text-sm text-muted-foreground">
                Tu tienda de electronica de confianza en La Habana, Cuba
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Tienda</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/products" className="hover:text-primary transition">Productos</Link></li>
                <li><Link href="/blog" className="hover:text-primary transition">Blog</Link></li>
                <li><Link href="/about" className="hover:text-primary transition">Informacion</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Contacto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="tel:+5363180910" className="hover:text-primary transition">+53 63180910</a></li>
                <li><a href="https://www.facebook.com/share/17fTcvKM4o/" className="hover:text-primary transition">Facebook</a></li>
                <li>D entre 21 y 23, Vedado, La Habana</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/" className="hover:text-primary transition">Terminos</Link></li>
                <li><Link href="/" className="hover:text-primary transition">Privacidad</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Neocharge. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
