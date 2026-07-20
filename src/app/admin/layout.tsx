import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AdminBottomNav } from '@/components/BottomNav'
import { LogoutButton } from '@/components/LogoutButton'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Use service role to bypass RLS when checking admin role
  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/membro')

  return (
    <div className="min-h-screen pb-safe">
      <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="w-8" />
        <h1 className="text-lg font-bold">Worship Planner</h1>
        <LogoutButton />
      </header>
      <main className="px-4 py-4">
        {children}
      </main>
      <AdminBottomNav />
    </div>
  )
}
