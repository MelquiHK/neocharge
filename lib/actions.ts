'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Helper: Verify admin access
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error(`No autenticado: ${authError?.message || 'Usuario no encontrado'}`)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw new Error(`Error al verificar perfil: ${profileError.message}`)
  }

  if (!profile?.is_admin) {
    throw new Error('Permiso denegado: No tienes acceso de administrador')
  }
  
  return supabase
}

// Helper: Upload file to Supabase Storage
export async function uploadImage(file: Buffer, bucket: string, fileName: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    })
  
  if (error) throw new Error(`Upload failed: ${error.message}`)
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName)
  
  return publicUrl
}

// Products
export async function createProductAction(formData: any) {
  try {
    const supabase = await verifyAdmin()

    if (!formData.name || !formData.price || formData.stock === undefined) {
      throw new Error('Campos requeridos: nombre, precio y stock')
    }

    console.log('[createProductAction] Inserting product:', {
      name: formData.name,
      price: formData.price,
      stock: formData.stock,
      image_url: formData.image_url ? 'provided' : 'none',
    })

    const { error, data } = await supabase
      .from('products')
      .insert({
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description || '',
        specifications: formData.specifications || '',
        price: parseFloat(formData.price),
        compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
        category_id: formData.category_id || null,
        image_url: formData.image_url || null,
        stock: parseInt(formData.stock),
        is_active: formData.is_active !== false,
        is_featured: formData.is_featured === true,
      })
      .select()

    if (error) {
      console.error('[createProductAction] Database error:', error)
      throw new Error(`Error en BD: ${error.message}`)
    }

    console.log('[createProductAction] Product created:', data[0]?.id)
    return data[0]
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[createProductAction] Error:', errorMsg)
    throw new Error(`Crear producto falló: ${errorMsg}`)
  }
}

export async function updateProductAction(id: string, formData: any) {
  const supabase = await verifyAdmin()

  try {
    const { error, data } = await supabase
      .from('products')
      .update({
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description || '',
        specifications: formData.specifications || '',
        price: parseFloat(formData.price),
        compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
        category_id: formData.category_id || null,
        image_url: formData.image_url || null,
        stock: parseInt(formData.stock),
        is_active: formData.is_active !== false,
        is_featured: formData.is_featured === true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()

    if (error) throw new Error(`Error en base de datos: ${error.message}`)
    return data[0]
  } catch (err) {
    throw err instanceof Error ? err : new Error('Error desconocido al actualizar producto')
  }
}

export async function deleteProductAction(id: string) {
  const supabase = await verifyAdmin()

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error('Failed to delete product')
}

// Blog Posts
export async function createBlogPostAction(formData: any) {
  const supabase = await verifyAdmin()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    if (!formData.title || !formData.content) {
      throw new Error('Campos requeridos: título y contenido')
    }

    const { error, data } = await supabase
      .from('blog_posts')
      .insert({
        title: formData.title,
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
        excerpt: formData.excerpt || '',
        content: formData.content,
        image_url: formData.image_url || null,
        category_id: formData.category_id || null,
        author_id: user?.id,
        is_published: formData.is_published === true,
      })
      .select()

    if (error) throw new Error(`Error en base de datos: ${error.message}`)
    return data[0]
  } catch (err) {
    throw err instanceof Error ? err : new Error('Error desconocido al crear artículo')
  }
}

export async function updateBlogPostAction(id: string, formData: any) {
  const supabase = await verifyAdmin()

  try {
    const { error, data } = await supabase
      .from('blog_posts')
      .update({
        title: formData.title,
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
        excerpt: formData.excerpt || '',
        content: formData.content,
        image_url: formData.image_url || null,
        category_id: formData.category_id || null,
        is_published: formData.is_published === true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()

    if (error) throw new Error(`Error en base de datos: ${error.message}`)
    return data[0]
  } catch (err) {
    throw err instanceof Error ? err : new Error('Error desconocido al actualizar artículo')
  }
}

export async function deleteBlogPostAction(id: string) {
  const supabase = await verifyAdmin()

  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) throw new Error('Failed to delete blog post')
}

// Orders
export async function updateOrderStatusAction(id: string, status: string) {
  const supabase = await verifyAdmin()

  const { error } = await supabase
    .from('orders')
    .update({ 
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error('Failed to update order status')
}

export async function updateOrderNotesAction(id: string, admin_notes: string) {
  const supabase = await verifyAdmin()

  const { error } = await supabase
    .from('orders')
    .update({ 
      admin_notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error('Failed to update order notes')
}

// Settings
export async function updateSettingAction(key: string, value: string) {
  const supabase = await verifyAdmin()

  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value })

  if (error) throw new Error('Failed to update setting')
}