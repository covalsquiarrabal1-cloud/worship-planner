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

  const { date, scaleTypeId, dayOfWeek, weekNumber, assignments } = await request.json()

  if (!date) return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 })

  const dateObj = new Date(date + 'T12:00:00')
  const monthNum = dateObj.getMonth() + 1
  const yearNum = dateObj.getFullYear()

  // Get or create schedule for the month
  const { data: existingSchedule } = await serviceClient
    .from('schedules')
    .select('id')
    .eq('month', monthNum)
    .eq('year', yearNum)
    .maybeSingle()

  let scheduleId: string

  if (existingSchedule) {
    scheduleId = existingSchedule.id
  } else {
    const { data: newSchedule, error: schedErr } = await serviceClient
      .from('schedules')
      .insert({ month: monthNum, year: yearNum })
      .select('id')
      .single()
    if (schedErr || !newSchedule) {
      return NextResponse.json({ error: 'Erro ao criar escala: ' + (schedErr?.message || '') }, { status: 500 })
    }
    scheduleId = newSchedule.id
  }

  // Check if event already exists for this date + scale type
  const { data: existingEvent } = await serviceClient
    .from('schedule_events')
    .select('id')
    .eq('schedule_id', scheduleId)
    .eq('event_date', date)
    .eq('scale_type_id', scaleTypeId || '')
    .maybeSingle()

  let eventId: string

  if (existingEvent) {
    eventId = existingEvent.id
    // Delete existing assignments
    await serviceClient.from('schedule_assignments').delete().eq('event_id', eventId)
    // Update the event
    await serviceClient
      .from('schedule_events')
      .update({
        day_of_week: dayOfWeek,
        week_number: weekNumber,
        scale_type_id: scaleTypeId || null,
      })
      .eq('id', eventId)
  } else {
    const { data: newEvent, error: evErr } = await serviceClient
      .from('schedule_events')
      .insert({
        schedule_id: scheduleId,
        event_date: date,
        day_of_week: dayOfWeek,
        week_number: weekNumber,
        scale_type_id: scaleTypeId || null,
      })
      .select('id')
      .single()
    if (evErr || !newEvent) {
      return NextResponse.json({ error: 'Erro ao criar evento: ' + (evErr?.message || '') }, { status: 500 })
    }
    eventId = newEvent.id
  }

  // Insert assignments
  const assignmentRows = Object.entries(assignments || {})
    .filter(([, memberId]) => memberId)
    .map(([role, memberId]) => ({
      event_id: eventId,
      member_id: memberId,
      role,
    }))

  if (assignmentRows.length > 0) {
    const { error: assErr } = await serviceClient.from('schedule_assignments').insert(assignmentRows)
    if (assErr) return NextResponse.json({ error: 'Erro ao salvar participantes: ' + assErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, eventId })
}
