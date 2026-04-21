import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60 // For Vercel Hobby tier

export async function POST(request: NextRequest) {
  try {
    console.log('[upload] Starting image upload')
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[upload] Auth error:', authError?.message)
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    console.log('[upload] User authenticated:', user.id)

    // Verify user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[upload] Profile error:', profileError.message)
      return NextResponse.json({ error: 'Error verificando perfil' }, { status: 500 })
    }

    if (!profile?.is_admin) {
      console.error('[upload] User is not admin')
      return NextResponse.json({ error: 'No tienes permisos de admin' }, { status: 403 })
    }
    console.log('[upload] User is admin')

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.error('[upload] No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    console.log('[upload] File received:', file.name, file.size, file.type)

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      console.error('[upload] File too large:', file.size)
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 5MB)' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.error('[upload] Invalid file type:', file.type)
      return NextResponse.json(
        { error: `Tipo de archivo no permitido. Usa: JPG, PNG, WebP` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${crypto.randomUUID()}.${ext}`
    const bucket = 'products'
    console.log('[upload] Generated filename:', fileName)

    // Convert File to Uint8Array
    const buffer = await file.arrayBuffer()
    console.log('[upload] Buffer ready, size:', buffer.byteLength)

    // Upload to Supabase Storage
    console.log('[upload] Starting upload to bucket:', bucket)
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, new Uint8Array(buffer), {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      console.error('[upload] Storage upload error:', error)
      return NextResponse.json(
        { error: `Error subiendo archivo: ${error.message}` },
        { status: 500 }
      )
    }
    console.log('[upload] File uploaded successfully:', data)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    console.log('[upload] Public URL generated:', publicUrl)
    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('[upload] Catch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error'
    return NextResponse.json(
      { error: `Error de servidor: ${errorMessage}` },
      { status: 500 }
    )
  }
}
