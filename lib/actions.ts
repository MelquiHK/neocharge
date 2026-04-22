'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Helper: Verify admin access with better error logging
async function verifyAdmin() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('[verifyAdmin] Auth error:', authError)
      throw new Error(`Autenticación falló: ${authError.message}`)
    }

    if (!user) {
      console.error('[verifyAdmin] No user found')
      throw new Error('No estás autenticado')
    }

    console.log('[verifyAdmin] User:', user.id)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[verifyAdmin] Profile error:', profileError)
      throw new Error(`Perfil no encontrado: ${profileError.message}`)
    }

    if (!profile?.is_admin) {
      console.error('[verifyAdmin] User is not admin')
      throw new Error('No tienes permisos de administrador')
    }

    console.log('[verifyAdmin] Admin verified successfully')
    return supabase
  } catch (err) {
    console.error('[verifyAdmin] Verification failed:', err)
    throw err
  }
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

// Products - CREATE
export async function createProductAction(formData: any) {
  console.log('[createProductAction] Starting...')
  
  try {
    const supabase = await verifyAdmin()
    console.log('[createProductAction] Admin verified')

    // Validate required fields
    if (!formData.name?.trim()) {
      throw new Error('El nombre del producto es requerido')
    }
    if (!formData.price) {
      throw new Error('El precio es requerido')
    }
    if (formData.stock === undefined || formData.stock === null || formData.stock === '') {
      throw new Error('El stock es requerido')
    }

    const productData = {
      name: formData.name.trim(),
      slug: (formData.slug?.trim() || formData.name.toLowerCase().replace(/\s+/g, '-')).trim(),
      description: formData.description?.trim() || null,
      specifications: formData.specifications?.trim() || null,
      price: parseFloat(formData.price),
      compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
      category_id: formData.category_id && formData.category_id !== '' ? formData.category_id : null,
      image_url: formData.image_url?.trim() || null,
      images: formData.images || [],
      stock: parseInt(formData.stock, 10),
      is_active: formData.is_active !== false,
      is_featured: formData.is_featured === true,
    }

    console.log('[createProductAction] Product data:', {
      ...productData,
      description: productData.description ? '...' : null,
    })

    const { error, data } = await supabase
      .from('products')
      .insert([productData])
      .select()

    if (error) {
      console.error('[createProductAction] Insert error:', error)
      throw new Error(`No se pudo guardar el producto en la BD: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error('El producto se guardó pero no se pudo recuperar')
    }

    console.log('[createProductAction] Success:', data[0].id)
    return data[0]
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al crear producto'
    console.error('[createProductAction] Error:', msg, err)
    throw new Error(`❌ Error creando producto: ${msg}`)
  }
}

export async function updateProductAction(id: string, formData: any) {
  const supabase = await verifyAdmin()

  try {
    // Validation
    if (!formData.name || formData.name.trim() === '') {
      throw new Error('El nombre del producto es requerido')
    }
    
    const price = parseFloat(formData.price)
    if (isNaN(price) || price < 0) {
      throw new Error('El precio debe ser un número válido mayor o igual a 0')
    }

    const stock = parseInt(formData.stock)
    if (isNaN(stock) || stock < 0) {
      throw new Error('El stock debe ser un número entero válido')
    }

    console.log('[updateProductAction] Updating product:', id)
    console.log('[updateProductAction] Data:', {
      name: formData.name,
      price,
      stock,
    })

    const updateData = {
      name: formData.name.trim(),
      slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
      description: formData.description || '',
      specifications: formData.specifications || '',
      price,
      compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
      category_id: formData.category_id || null,
      stock,
      is_active: formData.is_active !== false,
      is_featured: formData.is_featured === true,
      updated_at: new Date().toISOString(),
    }

    const { error, data } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('[updateProductAction] Update error:', error)
      throw new Error(`No se pudo actualizar el producto: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error('El producto se actualizó pero no se pudo recuperar')
    }

    console.log('[updateProductAction] Success:', data[0].id)
    return data[0]
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al actualizar producto'
    console.error('[updateProductAction] Error:', msg, err)
    throw new Error(`❌ Error actualizando producto: ${msg}`)
  }
}

export async function deleteProductAction(id: string) {
  const supabase = await verifyAdmin()

  try {
    if (!id) {
      throw new Error('ID del producto es requerido')
    }

    console.log('[deleteProductAction] Deleting product:', id)

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[deleteProductAction] Delete error:', error)
      throw new Error(`No se pudo eliminar el producto: ${error.message}`)
    }

    console.log('[deleteProductAction] Success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al eliminar producto'
    console.error('[deleteProductAction] Error:', msg, err)
    throw new Error(`❌ Error eliminando producto: ${msg}`)
  }
}

// Blog Posts
export async function createBlogPostAction(formData: any) {
  const supabase = await verifyAdmin()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    // Validation
    if (!formData.title || formData.title.trim() === '') {
      throw new Error('El título del artículo es requerido')
    }

    if (!formData.content || formData.content.trim() === '') {
      throw new Error('El contenido del artículo es requerido')
    }

    if (!user) {
      throw new Error('No se pudo identificar al autor del artículo')
    }

    console.log('[createBlogPostAction] Creating blog post:', formData.title)

    const blogData = {
      title: formData.title.trim(),
      slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
      excerpt: formData.excerpt || '',
      content: formData.content,
      image_url: formData.image_url || null,
      category_id: formData.category_id || null,
      author_id: user.id,
      is_published: formData.is_published === true,
    }

    console.log('[createBlogPostAction] Blog data:', {
      ...blogData,
      content: blogData.content ? `${blogData.content.substring(0, 50)}...` : null,
    })

    const { error, data } = await supabase
      .from('blog_posts')
      .insert([blogData])
      .select()

    if (error) {
      console.error('[createBlogPostAction] Insert error:', error)
      throw new Error(`No se pudo guardar el artículo: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error('El artículo se guardó pero no se pudo recuperar')
    }

    console.log('[createBlogPostAction] Success:', data[0].id)
    return data[0]
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al crear artículo'
    console.error('[createBlogPostAction] Error:', msg, err)
    throw new Error(`❌ Error creando artículo: ${msg}`)
  }
}

export async function updateBlogPostAction(id: string, formData: any) {
  const supabase = await verifyAdmin()

  try {
    // Validation
    if (!formData.title || formData.title.trim() === '') {
      throw new Error('El título del artículo es requerido')
    }

    if (!formData.content || formData.content.trim() === '') {
      throw new Error('El contenido del artículo es requerido')
    }

    console.log('[updateBlogPostAction] Updating blog post:', id)

    const updateData = {
      title: formData.title.trim(),
      slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
      excerpt: formData.excerpt || '',
      content: formData.content,
      image_url: formData.image_url || null,
      category_id: formData.category_id || null,
      is_published: formData.is_published === true,
      updated_at: new Date().toISOString(),
    }

    const { error, data } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('[updateBlogPostAction] Update error:', error)
      throw new Error(`No se pudo actualizar el artículo: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error('El artículo se actualizó pero no se pudo recuperar')
    }

    console.log('[updateBlogPostAction] Success:', data[0].id)
    return data[0]
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al actualizar artículo'
    console.error('[updateBlogPostAction] Error:', msg, err)
    throw new Error(`❌ Error actualizando artículo: ${msg}`)
  }
}

export async function deleteBlogPostAction(id: string) {
  const supabase = await verifyAdmin()

  try {
    if (!id) {
      throw new Error('ID del artículo es requerido')
    }

    console.log('[deleteBlogPostAction] Deleting blog post:', id)

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[deleteBlogPostAction] Delete error:', error)
      throw new Error(`No se pudo eliminar el artículo: ${error.message}`)
    }

    console.log('[deleteBlogPostAction] Success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al eliminar artículo'
    console.error('[deleteBlogPostAction] Error:', msg, err)
    throw new Error(`❌ Error eliminando artículo: ${msg}`)
  }
}

// Orders
export async function updateOrderStatusAction(id: string, status: string) {
  const supabase = await verifyAdmin()

  try {
    if (!id) {
      throw new Error('ID de la orden es requerido')
    }

    if (!status || status.trim() === '') {
      throw new Error('El estado es requerido')
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      throw new Error(`Estado inválido. Valores válidos: ${validStatuses.join(', ')}`)
    }

    console.log('[updateOrderStatusAction] Updating order status:', { id, status })

    const { error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('[updateOrderStatusAction] Update error:', error)
      throw new Error(`No se pudo actualizar el estado: ${error.message}`)
    }

    console.log('[updateOrderStatusAction] Success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al actualizar orden'
    console.error('[updateOrderStatusAction] Error:', msg, err)
    throw new Error(`❌ Error actualizando orden: ${msg}`)
  }
}

export async function updateOrderNotesAction(id: string, admin_notes: string) {
  const supabase = await verifyAdmin()

  try {
    if (!id) {
      throw new Error('ID de la orden es requerido')
    }

    console.log('[updateOrderNotesAction] Updating order notes:', id)

    const { error } = await supabase
      .from('orders')
      .update({ 
        admin_notes: admin_notes || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('[updateOrderNotesAction] Update error:', error)
      throw new Error(`No se pudo guardar las notas: ${error.message}`)
    }

    console.log('[updateOrderNotesAction] Success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al guardar notas'
    console.error('[updateOrderNotesAction] Error:', msg, err)
    throw new Error(`❌ Error guardando notas: ${msg}`)
  }
}

// Settings
export async function updateSettingAction(key: string, value: string) {
  const supabase = await verifyAdmin()

  try {
    if (!key || key.trim() === '') {
      throw new Error('La clave de la configuración es requerida')
    }

    console.log('[updateSettingAction] Updating setting:', key)

    const { error } = await supabase
      .from('site_settings')
      .upsert({ 
        key: key.trim(), 
        value: value || '',
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('[updateSettingAction] Upsert error:', error)
      throw new Error(`No se pudo guardar la configuración: ${error.message}`)
    }

    console.log('[updateSettingAction] Success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al guardar configuración'
    console.error('[updateSettingAction] Error:', msg, err)
    throw new Error(`❌ Error guardando configuración: ${msg}`)
  }
}