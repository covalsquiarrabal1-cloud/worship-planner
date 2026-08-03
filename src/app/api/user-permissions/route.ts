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

  // Check person_roles
  const { data: personRoles } = await serviceClient
    .from('member_person_roles')
    .select('role_id, person_roles(name)')
    .eq('member_email', user.email?.toLowerCase() || '')

  const roles = (personRoles || []).map((pr: any) => pr.person_roles?.name).filter(Boolean)

  // Get allowed roles from settings
  const { data: setting } = await serviceClient
    .from('app_settings')
    .select('value')
    .eq('key', 'roles_can_view_all_schedules')
    .single()

  const allowedRoles: string[] = setting?.value && Array.isArray(setting.value) ? setting.value : ['Pastor', 'Ministro']
  const canViewAllSchedules = profile?.role === 'admin' || roles.some((r: string) => allowedRoles.includes(r))

  return NextResponse.json({
    isAdmin: profile?.role === 'admin',
    personRoles: roles,
    canViewAllSchedules,
  })
}
