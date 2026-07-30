import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()

  // Get ministry
  const { data: ministry } = await serviceClient
    .from('ministries').select('id, leader_user_id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  // Check permission (admin or leader)
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && ministry.leader_user_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { month, year } = await request.json()
  if (!month || !year) {
    return NextResponse.json({ error: 'Mês e ano obrigatórios' }, { status: 400 })
  }

  // Find the schedule
  const { data: schedule } = await serviceClient
    .from('ministry_schedules')
    .select('id')
    .eq('ministry_id', ministry.id)
    .eq('month', month)
    .eq('year', year)
    .single()

  if (!schedule) {
    return NextResponse.json({ error: 'Nenhuma escala encontrada para este mês' }, { status: 404 })
  }

  // Delete events (assignments cascade via foreign key or delete manually)
  const { data: events } = await serviceClient
    .from('ministry_events')
    .select('id')
    .eq('schedule_id', schedule.id)

  if (events && events.length > 0) {
    const eventIds = events.map(e => e.id)
    await serviceClient.from('ministry_assignments').delete().in('event_id', eventIds)
    await serviceClient.from('ministry_events').delete().eq('schedule_id', schedule.id)
  }

  // Delete the schedule itself
  await serviceClient.from('ministry_schedules').delete().eq('id', schedule.id)

  return NextResponse.json({ success: true })
}
