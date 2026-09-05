import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Use service role to bypass RLS when checking role
  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  // Check if user is staff (Pastor, Ministro, Secretaria)
  const { data: personRoles } = await serviceClient
    .from('member_person_roles')
    .select('role_id, person_roles(name)')
    .eq('member_email', user.email?.toLowerCase() || '')

  const userRoles = (personRoles || []).map((pr: any) => pr.person_roles?.name).filter(Boolean)
  const staffRoles = ['Pastor', 'Ministro', 'Secretaria']
  const isStaff = userRoles.some((r: string) => staffRoles.includes(r))

  if (isStaff) {
    redirect('/membro/dashboard')
  }

  // Ministry leader? (profiles.role, official leader_user_id, or a ministry_members
  // row flagged 'lider'/'ambos' matching the user's email). Route them to /lider.
  const userEmail = user.email?.toLowerCase() || ''

  let isLeader = profile?.role === 'ministry_leader'

  if (!isLeader) {
    const { data: officialLeader } = await serviceClient
      .from('ministries')
      .select('id')
      .eq('leader_user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (officialLeader) isLeader = true
  }

  if (!isLeader && userEmail) {
    const { data: leaderMember } = await serviceClient
      .from('ministry_members')
      .select('id')
      .in('role', ['lider', 'ambos'])
      .ilike('email', userEmail)
      .limit(1)
      .maybeSingle()
    if (leaderMember) isLeader = true
  }

  if (isLeader) {
    redirect('/lider')
  }

  redirect('/membro')
}
