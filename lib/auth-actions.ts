'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUpAction(formData: {
  email: string
  password: string
  username: string
  phone: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      data: {
        username: formData.username,
        phone: formData.phone,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Create profile in public.profiles table
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        username: formData.username,
        phone: formData.phone,
        is_admin: false,
      })

    if (profileError) {
      return { error: profileError.message }
    }
  }

  return { success: true, user: data.user }
}

export async function loginAction(formData: { email: string; password: string }) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function getSession() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    ...profile,
  }
}
