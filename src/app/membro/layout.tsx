import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MemberBottomNav } from '@/components/BottomNav'
import { LogoutButton } from '@/components/LogoutButton'

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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
      <MemberBottomNav />
    </div>
  )
}
