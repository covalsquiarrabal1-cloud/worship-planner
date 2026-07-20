import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MemberBottomNav } from '@/components/BottomNav'

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
      <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--border)] px-4 py-3">
        <h1 className="text-lg font-bold text-center">Worship Planner</h1>
      </header>
      <main className="px-4 py-4">
        {children}
      </main>
      <MemberBottomNav />
    </div>
  )
}
