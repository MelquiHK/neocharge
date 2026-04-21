import { createClient } from '@/lib/supabase/server'

/**
 * Script de verificación - Ejecutar en desarrollo para validar Supabase
 * 
 * Para usar:
 * 1. Copia este contenido en app/verify/page.tsx
 * 2. Navega a http://localhost:3000/verify
 * 3. Verifica los resultados
 */

export default async function VerifyPage() {
  let verification = {
    auth: 'unknown',
    database: 'unknown',
    storage: 'unknown',
    adminProfile: 'unknown',
    errors: [] as string[],
  }

  try {
    const supabase = await createClient()

    // Check Auth
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        verification.auth = 'error'
        verification.errors.push(`Auth error: ${authError.message}`)
      } else if (user) {
        verification.auth = 'ok'
      } else {
        verification.auth = 'not-logged-in'
        verification.errors.push('Usuario no autenticado - Por favor inicia sesión primero')
      }
    } catch (e) {
      verification.auth = 'error'
      verification.errors.push(`Auth check failed: ${e instanceof Error ? e.message : 'Unknown'}`)
    }

    // Check Database Connection
    try {
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact' })
      if (error) {
        verification.database = 'error'
        verification.errors.push(`Database error: ${error.message}`)
      } else {
        verification.database = 'ok'
      }
    } catch (e) {
      verification.database = 'error'
      verification.errors.push(`Database check failed: ${e instanceof Error ? e.message : 'Unknown'}`)
    }

    // Check Storage Bucket
    try {
      const { data, error } = await supabase.storage.listBuckets()
      if (error) {
        verification.storage = 'error'
        verification.errors.push(`Storage error: ${error.message}`)
      } else {
        const hasProductsBucket = data?.some((b) => b.name === 'products')
        if (hasProductsBucket) {
          verification.storage = 'ok'
        } else {
          verification.storage = 'missing-bucket'
          verification.errors.push(
            'El bucket "products" no existe. Crea uno en Supabase Storage.'
          )
        }
      }
    } catch (e) {
      verification.storage = 'error'
      verification.errors.push(`Storage check failed: ${e instanceof Error ? e.message : 'Unknown'}`)
    }

    // Check Admin Profile
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        if (error) {
          verification.adminProfile = 'error'
          verification.errors.push(`Profile query error: ${error.message}`)
        } else if (profile?.is_admin) {
          verification.adminProfile = 'ok-admin'
        } else {
          verification.adminProfile = 'not-admin'
          verification.errors.push('El usuario no es administrador')
        }
      }
    } catch (e) {
      verification.adminProfile = 'error'
      verification.errors.push(`Profile check failed: ${e instanceof Error ? e.message : 'Unknown'}`)
    }
  } catch (e) {
    verification.errors.push(`Fatal error: ${e instanceof Error ? e.message : 'Unknown'}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
      case 'ok-admin':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'not-logged-in':
      case 'missing-bucket':
      case 'not-admin':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
      case 'ok-admin':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '⚠️'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Verificación de Supabase</h1>

        <div className="space-y-4">
          {/* Auth Check */}
          <div className={`border-2 rounded-lg p-4 ${getStatusColor(verification.auth)}`}>
            <h2 className="text-lg font-semibold text-gray-900">
              {getStatusIcon(verification.auth)} Autenticación
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {verification.auth === 'ok' && 'Usuario autenticado'}
              {verification.auth === 'not-logged-in' && 'Inicia sesión en tu cuenta'}
              {verification.auth === 'error' && 'Error de autenticación'}
              {verification.auth === 'unknown' && 'Verificando...'}
            </p>
          </div>

          {/* Database Check */}
          <div className={`border-2 rounded-lg p-4 ${getStatusColor(verification.database)}`}>
            <h2 className="text-lg font-semibold text-gray-900">
              {getStatusIcon(verification.database)} Base de Datos
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {verification.database === 'ok' && 'Conexión a base de datos OK'}
              {verification.database === 'error' && 'Error conectando a la base de datos'}
              {verification.database === 'unknown' && 'Verificando...'}
            </p>
          </div>

          {/* Storage Check */}
          <div className={`border-2 rounded-lg p-4 ${getStatusColor(verification.storage)}`}>
            <h2 className="text-lg font-semibold text-gray-900">
              {getStatusIcon(verification.storage)} Storage (Imágenes)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {verification.storage === 'ok' && 'Bucket "products" disponible'}
              {verification.storage === 'missing-bucket' && 'Crea el bucket "products" en Supabase'}
              {verification.storage === 'error' && 'Error accediendo a Storage'}
              {verification.storage === 'unknown' && 'Verificando...'}
            </p>
          </div>

          {/* Admin Profile Check */}
          <div className={`border-2 rounded-lg p-4 ${getStatusColor(verification.adminProfile)}`}>
            <h2 className="text-lg font-semibold text-gray-900">
              {getStatusIcon(verification.adminProfile)} Permisos de Admin
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {verification.adminProfile === 'ok-admin' && 'Eres administrador'}
              {verification.adminProfile === 'not-admin' && 'Tu usuario no es administrador'}
              {verification.adminProfile === 'error' && 'Error verificando permisos'}
              {verification.adminProfile === 'unknown' && 'Verificando...'}
            </p>
          </div>

          {/* Errors */}
          {verification.errors.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-900 mb-4">Problemas Encontrados:</h2>
              <ul className="space-y-2">
                {verification.errors.map((error, i) => (
                  <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Message */}
          {verification.errors.length === 0 && verification.auth === 'ok' && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-900">✅ Todo está configurado correctamente</h2>
              <p className="text-sm text-green-700 mt-2">
                Puedes proceder a subir productos e imágenes sin problemas.
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900">📝 Si hay problemas:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
            <li>Verifica que hayas iniciado sesión en /auth/login</li>
            <li>Crea un bucket llamado "products" en Supabase Storage</li>
            <li>Asegúrate de que el bucket esté configurado como público</li>
            <li>Verifica que tu usuario sea administrador (is_admin = true en tabla profiles)</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
