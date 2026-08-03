import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { MemberBottomNav } from '@/components/BottomNav'
import { LogoutButton } from '@/components/LogoutButton'
import Link from 'next/link'

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const serviceClient = await createServiceRoleClient()

  // Check if user is a ministry leader
  const { data: leaderMinistries } = await serviceClient
    .from('ministries')
    .select('id, name, slug')
    .eq('leader_user_id', user.id)

  const isLeader = leaderMinistries && leaderMinistries.length > 0

  // Check if user is a worship member (in the main 'members' table)
  const { data: worshipMember } = await serviceClient
    .from('members')
    .select('id')
    .ilike('email', user.email || '')
    .single()

  const isWorshipMember = !!worshipMember

  // Check if user has Pastor or Ministro role (can view all schedules)
  const { data: personRoles } = await serviceClient
    .from('member_person_roles')
    .select('role_id, person_roles(name)')
    .eq('member_email', user.email?.toLowerCase() || '')

  const userRoles = (personRoles || []).map((pr: any) => pr.person_roles?.name).filter(Boolean)
  const canViewAllSchedules = userRoles.includes('Pastor') || userRoles.includes('Ministro')

  return (
    <div className="min-h-screen pb-safe">
      <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="w-8" />
        <h1 className="text-lg font-bold">Worship Planner</h1>
        <LogoutButton />
      </header>
      {isLeader && (
        <div className="px-4 pt-3">
          <Link
            href="/lider"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/30 text-[#58a6ff] text-sm font-medium hover:bg-[#58a6ff]/20 transition-colors"
          >
            ⚙️ Gerenciar Ministério
          </Link>
        </div>
      )}
      <main className="px-4 py-4">
        {children}
      </main>
      <MemberBottomNav showMusicas={isWorshipMember} showAllSchedules={canViewAllSchedules} />
    </div>
  )
}
