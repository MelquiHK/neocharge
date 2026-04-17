'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/header'
import { CheckCircle, Clock, MapPin, Phone } from 'lucide-react'

export default function AboutPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('*')
          .in('key', ['about_page', 'store_info'])

        if (data) {
          const settingsMap = data.reduce((acc: any, item: any) => {
            acc[item.key] = item.value
            return acc
          }, {})
          setSettings(settingsMap)
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-12 animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  const aboutData = settings?.about_page || {}
  const storeInfo = settings?.store_info || {}

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Header */}
      <section className="border-b">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Informacion de Neocharge</h1>
          <p className="text-muted-foreground">Todo lo que necesitas saber sobre nuestros productos y servicio</p>
        </div>
      </section>

      {/* Warranty Section */}
      <section className="py-16 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-foreground mb-8">Garantia de Nuestros Productos</h2>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Prueba Obligatoria al Cliente</h3>
                <p className="text-muted-foreground">
                  Todos nuestros productos se prueban obligatoriamente al cliente para garantizar su correcto funcionamiento. Esto asegura que recibas un producto en perfecto estado.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">Cambios y Devoluciones</h3>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <CheckCircle className="text-accent flex-shrink-0 w-6 h-6 mt-1" />
                    <div>
                      <p className="font-semibold text-foreground">24 horas para probar</p>
                      <p className="text-muted-foreground text-sm">Si no puedes probar el producto en el momento (por apagones u otra razon), tienes 24 horas para hacerlo. En ese plazo puedes cambiarlo o solicitar devolucion si no funciona.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle className="text-accent flex-shrink-0 w-6 h-6 mt-1" />
                    <div>
                      <p className="font-semibold text-foreground">Cambio inmediato</p>
                      <p className="text-muted-foreground text-sm">Si el producto presenta defectos de fabrica, te lo cambiamos por uno nuevo sin costo adicional.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle className="text-accent flex-shrink-0 w-6 h-6 mt-1" />
                    <div>
                      <p className="font-semibold text-foreground">Devolucion de dinero</p>
                      <p className="text-muted-foreground text-sm">Si el producto no funciona dentro del plazo de 24 horas, te devolvemos tu dinero completo.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-8">
                <h4 className="font-semibold text-destructive mb-2">Excepciones</h4>
                <p className="text-sm text-destructive/90">
                  No se aceptan cambios ni devoluciones si el producto presenta danos fisicos, particulas, rajaduras, senales de golpes, o si se determina que no es uno de nuestros productos. El producto debe estar en las mismas condiciones en que fue entregado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Section */}
      <section className="py-16 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-foreground mb-8">Opciones de Entrega</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="border border-border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">Retiro en Local</h3>
                <p className="text-muted-foreground mb-4">
                  Puedes recoger tu pedido en cualquiera de nuestros locales en La Habana.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Horario:</strong> {storeInfo.hours || '24 horas'}</p>
                  <p><strong>Direccion:</strong> {storeInfo.address || 'D entre 21 y 23, Vedado, La Habana'}</p>
                </div>
              </div>

              <div className="border border-border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">Mensajeria</h3>
                <p className="text-muted-foreground mb-4">
                  Te llevamos el producto a tu domicilio segun tu ubicacion.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Precio:</strong> Varia segun la zona</p>
                  <p><strong>Plazo:</strong> Mismo dia o siguiente</p>
                  <p><strong>Nota:</strong> El precio de la mensajeria se coordina por WhatsApp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-foreground mb-8">Contactanos</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <Phone className="text-primary flex-shrink-0 w-6 h-6 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">WhatsApp</h3>
                  <a
                    href={`https://wa.me/${storeInfo.whatsapp?.replace(/\s+/g, '') || '5363180910'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {storeInfo.phone || '+53 63180910'}
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <MapPin className="text-primary flex-shrink-0 w-6 h-6 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">Ubicacion</h3>
                  <p className="text-muted-foreground">
                    {storeInfo.address || 'D entre 21 y 23, Vedado, La Habana'}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Clock className="text-primary flex-shrink-0 w-6 h-6 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">Horario de Atencion</h3>
                  <p className="text-muted-foreground">
                    {storeInfo.hours || '24 horas'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
