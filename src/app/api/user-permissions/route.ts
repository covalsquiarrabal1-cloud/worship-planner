import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Check profile role
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Check person_roles (Pastor, Ministro, etc.)
  const { data: personRoles } = await serviceClient
    .from('member_person_roles')
    .select('role_id, person_roles(name)')
    .eq('member_email', user.email?.toLowerCase() || '')

  const roles = (personRoles || []).map((pr: any) => pr.person_roles?.name).filter(Boolean)

  // Can view all schedules if Pastor or Ministro
  const canViewAllSchedules = profile?.role === 'admin' || roles.includes('Pastor') || roles.includes('Ministro')

  return NextResponse.json({
    isAdmin: profile?.role === 'admin',
    personRoles: roles,
    canViewAllSchedules,
  })
}
