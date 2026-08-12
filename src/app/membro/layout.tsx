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

  // Check if user has permission to view all schedules (from app_settings)
  const { data: personRoles } = await serviceClient
    .from('member_person_roles')
    .select('role_id, person_roles(name)')
    .eq('member_email', user.email?.toLowerCase() || '')

  const userRoles = (personRoles || []).map((pr: any) => pr.person_roles?.name).filter(Boolean)

  // Get allowed roles from settings
  const { data: setting } = await serviceClient
    .from('app_settings')
    .select('value')
    .eq('key', 'roles_can_view_all_schedules')
    .single()

  const allowedRoles: string[] = setting?.value && Array.isArray(setting.value) ? setting.value : ['Pastor', 'Ministro']
  const canViewAllSchedules = userRoles.some((r: string) => allowedRoles.includes(r))

  // Staff roles: Pastor, Ministro, Secretaria - can view all schedules, ministries, reports, config (read-only)
  const staffRoles = ['Pastor', 'Ministro', 'Secretaria']
  const isStaff = userRoles.some((r: string) => staffRoles.includes(r))

  return (
    <div className="min-h-screen pb-safe">
      <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--border)] px-6 py-3 flex items-center justify-between">
        <div className="w-8" />
        <h1 className="text-lg font-bold">Worship Planner</h1>
        <LogoutButton />
      </header>
      {isLeader && (
        <div className="px-6 pt-3">
          <Link
            href="/lider"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/30 text-[#58a6ff] text-sm font-medium hover:bg-[#58a6ff]/20 transition-colors"
          >
            ⚙️ Gerenciar Ministério
          </Link>
        </div>
      )}
      <main className="px-6 py-4">
        {children}
      </main>
      <MemberBottomNav showMusicas={isWorshipMember} showAllSchedules={canViewAllSchedules} isStaff={isStaff} />
    </div>
  )
}
