'use client'

import { LogOut } from 'lucide-react'
import { signOutAction } from '@/lib/auth-actions'

export function LogoutButton() {
  const handleLogout = async () => {
    await signOutAction()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition"
    >
      <LogOut size={18} />
      Cerrar Sesion
    </button>
  )
}