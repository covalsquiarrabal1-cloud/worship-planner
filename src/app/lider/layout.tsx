import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/LogoutButton'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function LiderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if user is leader of any ministry
  const serviceClient = await createServiceRoleClient()
  const { data: ministries } = await serviceClient
    .from('ministries')
    .select('id, name, slug')
    .eq('leader_user_id', user.id)

  if (!ministries || ministries.length === 0) {
    // Not a leader, redirect to member view
    redirect('/membro')
  }

  return (
    <div style={{ overflowX: 'hidden', width: '100%', maxWidth: '100vw', position: 'relative' }}>
      <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/membro" className="p-2 rounded-lg hover:bg-[var(--accent)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">Painel do Líder</h1>
          <LogoutButton />
        </div>
      </header>
      <main className="px-6 py-6 max-w-5xl mx-auto">
        {children}
        <div style={{ height: '40px' }} aria-hidden="true" />
      </main>
    </div>
  )
}
