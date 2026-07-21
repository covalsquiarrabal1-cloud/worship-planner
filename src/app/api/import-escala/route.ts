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

  const month = 7
  const year = 2026

  // Delete existing schedule for July 2026
  const { data: existingSchedule } = await serviceClient
    .from('schedules').select('id').eq('month', month).eq('year', year).single()

  if (existingSchedule) {
    await serviceClient.from('schedule_events').delete().eq('schedule_id', existingSchedule.id)
    await serviceClient.from('schedules').delete().eq('id', existingSchedule.id)
  }

  // Create schedule
  const { data: schedule, error: schedErr } = await serviceClient
    .from('schedules').insert({ month, year }).select('id').single()
  if (schedErr || !schedule) return NextResponse.json({ error: 'Erro ao criar schedule: ' + schedErr?.message }, { status: 500 })

  // Load members and scale types
  const { data: membersData } = await serviceClient.from('members').select('id, name')
  const { data: scaleTypesData } = await serviceClient.from('scale_types').select('id, name')

  const members = membersData || []
  const scaleTypes = scaleTypesData || []

  function findMember(name: string) {
    if (!name || name === '-') return null
    return members.find(m => m.name.toUpperCase() === name.toUpperCase())
  }

  function findScaleType(name: string) {
    return scaleTypes.find(st => st.name.toUpperCase() === name.toUpperCase())
  }

  // The schedule data
  const escala = [
    { date: '2026-07-03', dow: 'Sexta-Feira', week: 1, culto: 'STRONGBROTHERS', v1: 'COVALSQUI', v2: 'EDUARDO', v3: 'MATHEUS', bat: 'MATEUS LUNA', gui: 'LUCAS', bai: 'JOSÉ' },
    { date: '2026-07-04', dow: 'Sábado', week: 1, culto: 'ALIVE', v1: 'EDUARDO', v2: 'ÉRICA', v3: 'LETÍCIA', bat: 'MATEUS LUNA', gui: 'COVALSQUI', bai: 'JOSÉ' },
    { date: '2026-07-04', dow: 'Sábado', week: 1, culto: 'EXITO', v1: 'COVALSQUI', v2: '', v3: '', bat: '', gui: 'COVALSQUI', bai: '' },
    { date: '2026-07-05', dow: 'Domingo', week: 1, culto: 'CELEBRAÇÃO', v1: 'EDUARDO', v2: 'FRANCIELE', v3: 'MICHELE', bat: 'MATEUS LUNA', gui: 'LUCAS', bai: 'JOSÉ' },
    { date: '2026-07-10', dow: 'Sexta-Feira', week: 2, culto: 'ALIVE', v1: 'COVALSQUI', v2: 'FRANCIELE', v3: 'MAVI', bat: 'MOISES', gui: 'COVALSQUI', bai: 'JOSÉ' },
    { date: '2026-07-12', dow: 'Domingo', week: 2, culto: 'CELEBRAÇÃO', v1: 'MAICON', v2: 'ÉRICA', v3: 'MAVI', bat: 'MOISES', gui: 'COVALSQUI', bai: 'LUCAS' },
    { date: '2026-07-17', dow: 'Sexta-Feira', week: 3, culto: 'AC CASAIS', v1: 'COVALSQUI', v2: 'MAIARA', v3: 'ÉRICA', bat: 'MOISES', gui: 'COVALSQUI', bai: 'LUCAS' },
    { date: '2026-07-18', dow: 'Sábado', week: 3, culto: 'ALIVE', v1: 'MATHEUS', v2: 'MICHELE', v3: 'LETÍCIA', bat: 'MOISES', gui: 'LUCAS', bai: 'JOSÉ' },
    { date: '2026-07-18', dow: 'Sábado', week: 3, culto: 'GENERAL SALGADO', v1: 'COVALSQUI', v2: '', v3: '', bat: 'MATEUS LUNA', gui: 'COVALSQUI', bai: '' },
    { date: '2026-07-19', dow: 'Domingo', week: 3, culto: 'CELEBRAÇÃO', v1: 'MATHEUS', v2: 'LETÍCIA', v3: 'FRANCIELE', bat: 'MOISES', gui: 'LUCAS', bai: 'JOSÉ' },
    { date: '2026-07-24', dow: 'Sexta-Feira', week: 4, culto: 'PROFÉTICA', v1: 'MATHEUS', v2: 'MAIARA', v3: 'MAVI', bat: 'MATEUS LUNA', gui: 'LUCAS', bai: 'JOSÉ' },
    { date: '2026-07-25', dow: 'Sábado', week: 4, culto: 'ALIVE', v1: 'EDUARDO', v2: 'FRANCIELE', v3: 'MICHELE', bat: 'MATEUS LUNA', gui: 'LUCAS', bai: 'JOSÉ' },
    { date: '2026-07-26', dow: 'Domingo', week: 4, culto: 'CELEBRAÇÃO', v1: 'COVALSQUI', v2: 'MICHELE', v3: 'ÉRICA', bat: 'MATEUS LUNA', gui: 'COVALSQUI', bai: 'JOSÉ' },
    { date: '2026-07-31', dow: 'Sexta-Feira', week: 5, culto: 'VIGÍLIA', v1: 'EDUARDO', v2: 'MAVI', v3: 'FRANCIELE', bat: 'MOISES', gui: 'LUCAS', bai: 'JOSÉ' },
  ]

  let eventsCreated = 0

  for (const row of escala) {
    const scaleType = findScaleType(row.culto)
    const weekNum = Math.ceil(new Date(row.date + 'T12:00:00').getDate() / 7)

    // Create event
    const { data: event, error: eventErr } = await serviceClient
      .from('schedule_events')
      .insert({
        schedule_id: schedule.id,
        event_date: row.date,
        day_of_week: row.dow,
        week_number: weekNum,
        scale_type_id: scaleType?.id || null,
      })
      .select('id')
      .single()

    if (eventErr || !event) continue

    // Build assignments
    const assignments: { event_id: string; member_id: string; role: string }[] = []

    const roles = [
      { name: row.v1, role: 'vocal_1' },
      { name: row.v2, role: 'vocal_2' },
      { name: row.v3, role: 'vocal_3' },
      { name: row.bat, role: 'bateria' },
      { name: row.gui, role: 'guitarra' },
      { name: row.bai, role: 'baixo' },
    ]

    for (const r of roles) {
      const member = findMember(r.name)
      if (member) {
        assignments.push({ event_id: event.id, member_id: member.id, role: r.role })
      }
    }

    if (assignments.length > 0) {
      await serviceClient.from('schedule_assignments').insert(assignments)
    }

    eventsCreated++
  }

  return NextResponse.json({ success: true, eventsCreated })
}
