import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

interface SelectedDay {
  date: string
  dayOfWeek: string
  scaleName: string
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Verify admin
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { month, year, selectedDays } = await request.json() as {
    month: number
    year: number
    selectedDays: SelectedDay[]
  }

  if (!selectedDays || selectedDays.length === 0) {
    return NextResponse.json({ error: 'Nenhum dia selecionado' }, { status: 400 })
  }

  // Load members
  const { data: members } = await serviceClient
    .from('members')
    .select('*')
    .eq('is_blocked', false)
    .order('name')

  if (!members) return NextResponse.json({ error: 'Erro ao carregar membros' }, { status: 500 })

  // Load blocks
  const { data: blocks } = await serviceClient
    .from('member_blocks')
    .select('member_id, blocked_date')

  // Load day-of-week blocks
  const { data: dayBlocks } = await serviceClient
    .from('member_day_blocks')
    .select('member_id, day_of_week')

  // Get or create schedule for this month
  const { data: existingSchedule } = await serviceClient
    .from('schedules')
    .select('id')
    .eq('month', month)
    .eq('year', year)
    .single()

  let scheduleId: string

  if (existingSchedule) {
    scheduleId = existingSchedule.id
    await serviceClient.from('schedule_events').delete().eq('schedule_id', scheduleId)
  } else {
    const { data: newSchedule, error: schedErr } = await serviceClient
      .from('schedules')
      .insert({ month, year })
      .select('id')
      .single()
    if (schedErr || !newSchedule) {
      return NextResponse.json({ error: 'Erro ao criar schedule: ' + schedErr?.message }, { status: 500 })
    }
    scheduleId = newSchedule.id
  }

  // Get or create scale types
  const uniqueNames = [...new Set(selectedDays.map(d => d.scaleName).filter(Boolean))]
  const scaleTypeMap: Record<string, string> = {}

  for (const name of uniqueNames) {
    const { data: existing } = await serviceClient
      .from('scale_types')
      .select('id')
      .eq('name', name)
      .single()

    if (existing) {
      scaleTypeMap[name] = existing.id
    } else {
      const { data: created } = await serviceClient
        .from('scale_types')
        .insert({ name, type: 'normal' })
        .select('id')
        .single()
      if (created) scaleTypeMap[name] = created.id
    }
  }

  // Separate members by role
  const maleLeaders = members.filter(m => m.gender === 'male' && m.is_leader)
  const femaleLeaders = members.filter(m => m.gender === 'female' && m.is_leader)
  const femaleMembers = members.filter(m => m.gender === 'female' && !m.is_leader && !m.is_musician)
  const guitarists = members.filter(m => m.is_musician && m.instrument === 'guitarra')
  const bassists = members.filter(m => m.is_musician && m.instrument === 'baixo')
  const drummers = members.filter(m => m.is_musician && m.instrument === 'bateria')
  const keyboardists = members.filter(m => m.is_musician && m.instrument === 'teclado')

  let maleLeaderIdx = 0
  let femaleIdx = 0
  let guitarIdx = 0
  let bassIdx = 0
  let drumIdx = 0
  let keyboardIdx = 0

  const sortedDays = [...selectedDays].sort((a, b) => a.date.localeCompare(b.date))

  for (const day of sortedDays) {
    const dateObj = new Date(day.date + 'T12:00:00')
    const weekNum = Math.ceil(dateObj.getDate() / 7)
    const dayOfWeekNum = dateObj.getDay()

    // Members blocked on this specific date
    const blockedOnDate = (blocks || [])
      .filter(b => b.blocked_date === day.date)
      .map(b => b.member_id)

    // Members blocked on this day of week
    const blockedOnDayOfWeek = (dayBlocks || [])
      .filter(b => b.day_of_week === dayOfWeekNum)
      .map(b => b.member_id)

    const allBlocked = [...new Set([...blockedOnDate, ...blockedOnDayOfWeek])]

    function getAvailable(list: any[]) {
      return list.filter((m: any) => !allBlocked.includes(m.id))
    }

    function getNext(list: any[], idx: number): { member: any | null; newIdx: number } {
      const available = getAvailable(list)
      if (available.length === 0) return { member: null, newIdx: idx }
      const member = available[idx % available.length]
      return { member, newIdx: idx + 1 }
    }

    const scaleTypeId = day.scaleName ? scaleTypeMap[day.scaleName] || null : null

    const { data: event, error: eventErr } = await serviceClient
      .from('schedule_events')
      .insert({
        schedule_id: scheduleId,
        event_date: day.date,
        day_of_week: day.dayOfWeek,
        week_number: weekNum,
        scale_type_id: scaleTypeId,
      })
      .select('id')
      .single()

    if (eventErr || !event) continue

    const assignments: { event_id: string; member_id: string; role: string }[] = []

    // Vocal 1: male leader
    const ml = getNext(maleLeaders, maleLeaderIdx)
    if (ml.member) {
      assignments.push({ event_id: event.id, member_id: ml.member.id, role: 'vocal_1' })
      maleLeaderIdx = ml.newIdx
    }

    // Vocal 2 & 3: females
    const avFemales = getAvailable([...femaleLeaders, ...femaleMembers])
    for (let i = 0; i < 2 && i < avFemales.length; i++) {
      const idx = (femaleIdx + i) % avFemales.length
      assignments.push({ event_id: event.id, member_id: avFemales[idx].id, role: `vocal_${i + 2}` })
    }
    femaleIdx += 2

    // Musicians
    const gtr = getNext(guitarists, guitarIdx)
    if (gtr.member) {
      assignments.push({ event_id: event.id, member_id: gtr.member.id, role: 'guitarra' })
      guitarIdx = gtr.newIdx
    }

    const bss = getNext(bassists, bassIdx)
    if (bss.member) {
      assignments.push({ event_id: event.id, member_id: bss.member.id, role: 'baixo' })
      bassIdx = bss.newIdx
    }

    const drm = getNext(drummers, drumIdx)
    if (drm.member) {
      assignments.push({ event_id: event.id, member_id: drm.member.id, role: 'bateria' })
      drumIdx = drm.newIdx
    }

    const kbd = getNext(keyboardists, keyboardIdx)
    if (kbd.member) {
      assignments.push({ event_id: event.id, member_id: kbd.member.id, role: 'teclado' })
      keyboardIdx = kbd.newIdx
    }

    if (assignments.length > 0) {
      await serviceClient.from('schedule_assignments').insert(assignments)
    }
  }

  return NextResponse.json({ success: true, eventsCreated: sortedDays.length })
}
