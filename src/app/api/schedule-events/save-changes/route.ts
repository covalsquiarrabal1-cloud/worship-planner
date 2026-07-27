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

  const { month, year, selectedDays } = await request.json()

  if (!month || !year || !selectedDays) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Find existing schedule
  const { data: schedule } = await serviceClient
    .from('schedules')
    .select('id')
    .eq('month', month)
    .eq('year', year)
    .single()

  if (!schedule) {
    return NextResponse.json({ error: 'Nenhuma escala encontrada para este mês. Gere primeiro.' }, { status: 404 })
  }

  // Load existing events
  const { data: existingEvents } = await serviceClient
    .from('schedule_events')
    .select('id, event_date, scale_type_id')
    .eq('schedule_id', schedule.id)

  const events = existingEvents || []

  // Load scale types
  const { data: scaleTypes } = await serviceClient.from('scale_types').select('id, name')
  const stMap: Record<string, string> = {}
  for (const st of (scaleTypes || [])) {
    stMap[st.name.toUpperCase()] = st.id
  }

  // Determine which dates should exist (from selectedDays)
  const desiredDates = selectedDays.map((d: any) => d.date)

  // Delete events that were removed (not in selectedDays anymore)
  for (const event of events) {
    if (!desiredDates.includes(event.event_date)) {
      // Check if there are multiple events on same date - match by scale type too
      await serviceClient.from('schedule_events').delete().eq('id', event.id)
    }
  }

  // Update scale_type for existing events that changed
  for (const day of selectedDays) {
    const matchingEvent = events.find((e: any) => e.event_date === day.date)
    if (matchingEvent && day.scaleName) {
      const scaleTypeId = stMap[day.scaleName.toUpperCase()] || null
      if (scaleTypeId && scaleTypeId !== matchingEvent.scale_type_id) {
        await serviceClient
          .from('schedule_events')
          .update({ scale_type_id: scaleTypeId })
          .eq('id', matchingEvent.id)
      }
    }
  }

  return NextResponse.json({ success: true })
}
