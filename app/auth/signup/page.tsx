'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUpAction } from '@/lib/auth-actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.username || !formData.phone) {
      setError('Todos los campos son requeridos')
      return false
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError('La contraseña debe incluir al menos una mayúscula')
      return false
    }
    if (!/[a-z]/.test(formData.password)) {
      setError('La contraseña debe incluir al menos una minúscula')
      return false
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('La contraseña debe incluir al menos un número')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return false
    }
    if (formData.phone.length < 8) {
      setError('Ingresa un número de teléfono válido')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')

    const result = await signUpAction({
      email: formData.email,
      password: formData.password,
      username: formData.username,
      phone: formData.phone,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-accent" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Cuenta Creada</h1>
              <p className="text-muted-foreground">
                Hemos enviado un correo a <strong>{formData.email}</strong> para confirmar tu cuenta.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              <p>Revisa tu bandeja de entrada y haz clic en el enlace para confirmar tu correo electronico.</p>
            </div>
            <Link href="/auth/login">
              <Button className="w-full">Volver a Iniciar Sesion</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Crear Cuenta</h1>
            <p className="text-muted-foreground">Bienvenido a Neocharge</p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
            <p className="text-foreground font-semibold mb-2">Ventajas de crear una cuenta:</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>✓ Historial de compras organizado</li>
              <li>✓ Acceso rapido desde cualquier dispositivo</li>
              <li>✓ Notificaciones de nuevos productos</li>
              <li>✓ Ofertas exclusivas para clientes registrados</li>
            </ul>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre de Usuario</label>
              <Input
                type="text"
                name="username"
                placeholder="tucuenta"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

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
              <label className="block text-sm font-medium mb-2">Numero de Telefono</label>
              <Input
                type="tel"
                name="phone"
                placeholder="+53 123 45678"
                value={formData.phone}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Lo usaremos para contactarte con tu pedido</p>
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
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirmar Contrasena</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Recuerda tu correo y contrasena para futuras sesiones
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creando Cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Iniciar Sesion
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
