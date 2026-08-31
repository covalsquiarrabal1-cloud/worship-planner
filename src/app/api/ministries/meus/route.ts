import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // 1. Ministérios onde o usuário é o líder oficial
  const { data: officialMinistries } = await serviceClient
    .from('ministries')
    .select('*')
    .eq('leader_user_id', user.id)
    .order('name')

  const ministryMap = new Map<string, any>()
  for (const m of officialMinistries || []) ministryMap.set(m.id, m)

  // 2. Ministérios onde o usuário é líder via ministry_members (múltiplos líderes)
  const { data: profile } = await serviceClient
    .from('profiles').select('email').eq('id', user.id).single()

  if (profile?.email) {
    const { data: leaderMemberships } = await serviceClient
      .from('ministry_members')
      .select('ministry_id')
      .in('role', ['lider', 'ambos'])
      .ilike('email', profile.email)

    const extraIds = (leaderMemberships || [])
      .map(l => l.ministry_id)
      .filter(id => !ministryMap.has(id))

    if (extraIds.length > 0) {
      const { data: extraMinistries } = await serviceClient
        .from('ministries')
        .select('*')
        .in('id', extraIds)
        .order('name')
      for (const m of extraMinistries || []) ministryMap.set(m.id, m)
    }
  }

  const result = Array.from(ministryMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  return NextResponse.json(result)
}
