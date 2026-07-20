'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const supabase = createClient()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="p-2 text-[var(--muted-foreground)] hover:text-white transition-colors"
      title="Sair"
    >
      <LogOut className="w-5 h-5" />
    </button>
  )
}
