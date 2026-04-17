'use client'

import { useState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/lib/auth-actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await loginAction(formData)
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Iniciar Sesion</h1>
            <p className="text-muted-foreground">Bienvenido a Neocharge</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Correo Electronico</label>
              <Input
                type="email"
                name="email"
                placeholder="tu@correo.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contrasena</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Recuerda tu correo y contrasena para futuras sesiones
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Cargando...' : 'Iniciar Sesion'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-muted-foreground">o</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">
              Nuevo en Neocharge?{' '}
              <Link href="/auth/signup" className="text-primary font-semibold hover:underline">
                Crear Cuenta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
