import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Save } from 'lucide-react'

export default async function AdminSettingsPage() {
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

  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')

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
          <h1 className="text-3xl font-bold text-foreground">Configuración de la Tienda</h1>
        </div>
      </div>

      {/* Settings Content */}
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <form className="space-y-8">
          {/* Store Information */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Información de la Tienda</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre de la Tienda
                </label>
                <Input
                  defaultValue="Neocharge"
                  placeholder="Nombre de tu tienda"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Teléfono de Contacto
                </label>
                <Input
                  defaultValue="+5363180910"
                  placeholder="+53 XXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  WhatsApp (para mensajes)
                </label>
                <Input
                  defaultValue="+5363180910"
                  placeholder="+53 XXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Dirección Física
                </label>
                <Input
                  defaultValue="D entre 21 y 23, Vedado, La Habana"
                  placeholder="Tu dirección"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Horario de Atención
                </label>
                <Input
                  defaultValue="24 horas"
                  placeholder="Horario"
                />
              </div>
            </div>
          </div>

          {/* Delivery Settings */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Configuración de Envíos</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Costo de Envío (USD)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue="5"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Texto de Política de Envío
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  rows={4}
                  placeholder="Describe tu política de envío"
                  defaultValue="Entrega en La Habana en 24 horas o menos"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Warranty Settings */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Política de Garantía</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Texto de Garantía
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  rows={4}
                  placeholder="Describe tu política de garantía"
                  defaultValue="Todos los productos se prueban obligatoriamente con el cliente. 24 horas para devolver o cambiar."
                ></textarea>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button size="lg" className="gap-2">
              <Save size={18} />
              Guardar Cambios
            </Button>
            <Link href="/admin">
              <Button size="lg" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}