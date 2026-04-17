import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            Error de Autenticación
          </h1>
          <p className="mt-2 text-muted-foreground">
            Ha ocurrido un error durante la autenticación. Por favor, intenta de nuevo.
          </p>
          <div className="mt-6 space-y-4">
            <Link href="/auth/login">
              <Button className="w-full">
                Ir al Login
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Volver al Inicio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}