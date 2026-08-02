import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Buscar contagens em paralelo
  const [ministriesRes, membersRes, leadersRes, generalLeadersRes] = await Promise.all([
    serviceClient.from('ministries').select('id', { count: 'exact', head: true }),
    serviceClient.from('members').select('id', { count: 'exact', head: true }),
    serviceClient.from('members').select('id', { count: 'exact', head: true }).eq('is_leader', true),
    serviceClient.from('members').select('id', { count: 'exact', head: true }).eq('is_general_leader', true),
  ])

  return NextResponse.json({
    ministries: ministriesRes.count || 0,
    members: membersRes.count || 0,
    leaders: leadersRes.count || 0,
    ministers: generalLeadersRes.count || 0,
  })
}
