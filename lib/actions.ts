'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Helper: Verify admin access
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Forbidden')
  
  return supabase
}

// Products
export async function createProductAction(formData: any) {
  const supabase = await verifyAdmin()

  const { error, data } = await supabase
    .from('products')
    .insert({
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
      description: formData.description,
      specifications: formData.specifications,
      price: parseFloat(formData.price),
      compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
      category_id: formData.category_id,
      images: formData.images || [],
      stock: parseInt(formData.stock),
      is_active: formData.is_active !== false,
      is_featured: formData.is_featured === true,
    })
    .select()

  if (error) throw new Error(error.message)
  return data[0]
}

export async function updateProductAction(id: string, formData: any) {
  const supabase = await verifyAdmin()

  const { error, data } = await supabase
    .from('products')
    .update({
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
      description: formData.description,
      specifications: formData.specifications,
      price: parseFloat(formData.price),
      compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
      category_id: formData.category_id,
      images: formData.images || [],
      stock: parseInt(formData.stock),
      is_active: formData.is_active !== false,
      is_featured: formData.is_featured === true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()

  if (error) throw new Error(error.message)
  return data[0]
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

  const { error, data } = await supabase
    .from('blog_posts')
    .insert({
      title: formData.title,
      slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
      excerpt: formData.excerpt,
      content: formData.content,
      image_url: formData.image_url,
      category_id: formData.category_id,
      author_id: user?.id,
      is_published: formData.is_published === true,
    })
    .select()

  if (error) throw new Error(error.message)
  return data[0]
}

export async function updateBlogPostAction(id: string, formData: any) {
  const supabase = await verifyAdmin()

  const { error, data } = await supabase
    .from('blog_posts')
    .update({
      title: formData.title,
      slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
      excerpt: formData.excerpt,
      content: formData.content,
      image_url: formData.image_url,
      category_id: formData.category_id,
      is_published: formData.is_published === true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()

  if (error) throw new Error(error.message)
  return data[0]
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