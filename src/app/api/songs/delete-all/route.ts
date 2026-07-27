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

  const { start, end } = await request.json()
  if (!start || !end) return NextResponse.json({ error: 'start e end obrigatórios' }, { status: 400 })

  // Find all events in the date range
  const { data: events } = await serviceClient
    .from('schedule_events')
    .select('id')
    .gte('event_date', start)
    .lte('event_date', end)

  if (!events || events.length === 0) {
    return NextResponse.json({ error: 'Nenhum evento encontrado' }, { status: 404 })
  }

  // Delete all songs for these events
  const eventIds = events.map(e => e.id)
  const { error } = await serviceClient
    .from('songs')
    .delete()
    .in('event_id', eventIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
