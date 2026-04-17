'use server'

import { createClient } from '@/lib/supabase/server'

export async function deleteProductAction(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Forbidden')

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error('Failed to delete product')
}