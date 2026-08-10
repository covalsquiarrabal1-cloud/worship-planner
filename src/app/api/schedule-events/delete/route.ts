import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()

  // Delete individual events by IDs
  if (body.eventIds && Array.isArray(body.eventIds) && body.eventIds.length > 0) {
    // Delete songs for these events
    await serviceClient.from('songs').delete().in('event_id', body.eventIds)
    // Delete assignments for these events
    await serviceClient.from('schedule_assignments').delete().in('event_id', body.eventIds)
    // Delete the events
    const { error } = await serviceClient.from('schedule_events').delete().in('id', body.eventIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, deleted: body.eventIds.length })
  }

  // Delete all events for a month (legacy behavior)
  const { month, year } = body

  // Find the schedule
  const { data: schedule } = await serviceClient
    .from('schedules')
    .select('id')
    .eq('month', month)
    .eq('year', year)
    .single()

  if (!schedule) return NextResponse.json({ error: 'Escala não encontrada' }, { status: 404 })

  // Delete all events (cascade will delete assignments and songs)
  await serviceClient.from('schedule_events').delete().eq('schedule_id', schedule.id)
  
  // Delete the schedule itself
  await serviceClient.from('schedules').delete().eq('id', schedule.id)

  return NextResponse.json({ success: true })
}
