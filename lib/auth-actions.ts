'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const signUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(12, 'La contraseña debe tener al menos 12 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe incluir al menos una mayúscula')
    .regex(/[a-z]/, 'La contraseña debe incluir al menos una minúscula')
    .regex(/[0-9]/, 'La contraseña debe incluir al menos un número')
    .regex(/[!@#$%^&*]/, 'La contraseña debe incluir al menos un carácter especial'),
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres').max(20, 'El nombre de usuario no puede tener más de 20 caracteres'),
  phone: z.string().regex(/^\d{8,}$/, 'El teléfono debe tener al menos 8 dígitos'),
})

export async function signUpAction(formData: {
  email: string
  password: string
  username: string
  phone: string
}) {
  const validated = signUpSchema.parse(formData)

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: validated.email,
    password: validated.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      data: {
        username: validated.username,
        phone: validated.phone,
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
        username: validated.username,
        phone: validated.phone,
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

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    console.error('Error fetching profile:', error)
    return null
  }

  return {
    ...user,
    ...profile,
  }
}
