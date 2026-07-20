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

  // Load all data
  const [membersRes, blocksRes, dayBlocksRes, bandPatternRes, scaleTypesRes] = await Promise.all([
    serviceClient.from('members').select('*').eq('is_blocked', false).order('name'),
    serviceClient.from('member_blocks').select('member_id, blocked_date'),
    serviceClient.from('member_day_blocks').select('member_id, day_of_week'),
    serviceClient.from('band_pattern').select('*, instrument:instruments(id, name)').order('sort_order'),
    serviceClient.from('scale_types').select('*'),
  ])

  const members = membersRes.data || []
  const blocks = blocksRes.data || []
  const dayBlocks = dayBlocksRes.data || []
  const bandPattern = (bandPatternRes.data as any[]) || []
  const scaleTypes = scaleTypesRes.data || []

  if (members.length === 0) {
    return NextResponse.json({ error: 'Nenhum membro cadastrado' }, { status: 400 })
  }

  // Get or create schedule
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
    const existing = scaleTypes.find((st: any) => st.name === name)
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

  function getScaleTypeKind(scaleName: string): string {
    const st = scaleTypes.find((s: any) => s.name === scaleName)
    return st?.type || 'normal'
  }

  // === MEMBER POOLS ===
  const maleLeaders = members.filter(m => m.gender === 'male' && m.is_leader)
  const femaleLeaders = members.filter(m => m.gender === 'female' && m.is_leader)
  const backs = members.filter(m => m.is_back)
  const maleVocals = members.filter(m => m.gender === 'male' && !m.is_musician)
  const femaleVocals = members.filter(m => m.gender === 'female' && !m.is_musician)

  // Instrument pools
  const instrumentPools: Record<string, any[]> = {}
  members.forEach(m => {
    if (m.is_musician && m.instrument) {
      const key = m.instrument.toLowerCase()
      if (!instrumentPools[key]) instrumentPools[key] = []
      instrumentPools[key].push(m)
    }
  })

  // === ROUND-ROBIN TRACKING ===
  // Track usage count to ensure fair distribution
  const usageCount: Record<string, number> = {}
  members.forEach(m => { usageCount[m.id] = 0 })

  // Track saturday/sunday assignments for the rule:
  // "Each member needs at least 1 Saturday and 1 Sunday"
  const saturdayAssigned = new Set<string>()
  const sundayAssigned = new Set<string>()

  // Round-robin indexes per pool
  const rrIndex: Record<string, number> = {
    maleLeader: 0,
    femaleLeader: 0,
    back: 0,
    maleVocal: 0,
    femaleVocal: 0,
  }
  const instrumentRR: Record<string, number> = {}
  Object.keys(instrumentPools).forEach(k => { instrumentRR[k] = 0 })

  // Helper: get next available from pool (round-robin, no repeat until exhausted)
  function getNext(pool: any[], rrKey: string, blocked: Set<string>, assigned: Set<string>): any | null {
    const available = pool.filter(m => !blocked.has(m.id) && !assigned.has(m.id))
    if (available.length === 0) return null

    // Sort by usage count to distribute evenly
    available.sort((a, b) => (usageCount[a.id] || 0) - (usageCount[b.id] || 0))

    const idx = (rrIndex[rrKey] || 0) % available.length
    rrIndex[rrKey] = (rrIndex[rrKey] || 0) + 1
    return available[idx]
  }

  function getNextInstrument(instrumentName: string, blocked: Set<string>, assigned: Set<string>): any | null {
    const key = instrumentName.toLowerCase()
    const pool = instrumentPools[key] || []
    const available = pool.filter(m => !blocked.has(m.id) && !assigned.has(m.id))
    if (available.length === 0) return null

    available.sort((a, b) => (usageCount[a.id] || 0) - (usageCount[b.id] || 0))

    const idx = (instrumentRR[key] || 0) % available.length
    instrumentRR[key] = (instrumentRR[key] || 0) + 1
    return available[idx]
  }

  // === GENERATE EVENTS ===
  const sortedDays = [...selectedDays].sort((a, b) => a.date.localeCompare(b.date))

  for (const day of sortedDays) {
    const dateObj = new Date(day.date + 'T12:00:00')
    const weekNum = Math.ceil(dateObj.getDate() / 7)
    const dayOfWeekNum = dateObj.getDay()

    // Get blocked members for this specific date + day of week
    const blockedByDate = blocks.filter(b => b.blocked_date === day.date).map(b => b.member_id)
    const blockedByDay = dayBlocks.filter(b => b.day_of_week === dayOfWeekNum).map(b => b.member_id)
    const blockedSet = new Set([...blockedByDate, ...blockedByDay])

    const scaleTypeId = day.scaleName ? scaleTypeMap[day.scaleName] || null : null
    const scaleKind = day.scaleName ? getScaleTypeKind(day.scaleName) : 'normal'

    // Create event
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
    const assignedThisEvent = new Set<string>()

    // --- RULE: 1 Líder Masculino (Vocal 1) ---
    // --- RULE: 1 Líder Feminino ---
    // --- RULE: Vocals based on scale type ---

    if (scaleKind === 'strong_brothers') {
      // 3 male vocals (leaders first)
      const malePool = [...maleLeaders, ...maleVocals]
      for (let i = 0; i < 3; i++) {
        const member = getNext(malePool, 'maleVocal', blockedSet, assignedThisEvent)
        if (member) {
          assignments.push({ event_id: event.id, member_id: member.id, role: `vocal_${i + 1}` })
          assignedThisEvent.add(member.id)
          usageCount[member.id]++
        }
      }
    } else if (scaleKind === 'empoderadas') {
      // 3 female vocals (leaders first)
      const femalePool = [...femaleLeaders, ...femaleVocals]
      for (let i = 0; i < 3; i++) {
        const member = getNext(femalePool, 'femaleVocal', blockedSet, assignedThisEvent)
        if (member) {
          assignments.push({ event_id: event.id, member_id: member.id, role: `vocal_${i + 1}` })
          assignedThisEvent.add(member.id)
          usageCount[member.id]++
        }
      }
    } else {
      // NORMAL: 1 male leader (Vocal 1) + 2 female vocals
      const ml = getNext(maleLeaders, 'maleLeader', blockedSet, assignedThisEvent)
      if (ml) {
        assignments.push({ event_id: event.id, member_id: ml.id, role: 'vocal_1' })
        assignedThisEvent.add(ml.id)
        usageCount[ml.id]++
      }

      // 2 female vocals (leaders have priority)
      const femalePool = [...femaleLeaders, ...femaleVocals]
      for (let i = 0; i < 2; i++) {
        const member = getNext(femalePool, 'femaleVocal', blockedSet, assignedThisEvent)
        if (member) {
          assignments.push({ event_id: event.id, member_id: member.id, role: `vocal_${i + 2}` })
          assignedThisEvent.add(member.id)
          usageCount[member.id]++
        }
      }
    }

    // --- RULE: 1 Back vocal ---
    const back = getNext(backs, 'back', blockedSet, assignedThisEvent)
    if (back) {
      assignments.push({ event_id: event.id, member_id: back.id, role: 'back' })
      assignedThisEvent.add(back.id)
      usageCount[back.id]++
    }

    // --- INSTRUMENTS from band_pattern or fallback ---
    const instrumentPatterns = bandPattern.filter((bp: any) => !bp.is_vocal && bp.instrument)

    if (instrumentPatterns.length > 0) {
      for (const ip of instrumentPatterns) {
        const instrName = ip.instrument.name.toLowerCase()
        for (let q = 0; q < ip.quantity; q++) {
          const member = getNextInstrument(instrName, blockedSet, assignedThisEvent)
          if (member) {
            assignments.push({ event_id: event.id, member_id: member.id, role: instrName })
            assignedThisEvent.add(member.id)
            usageCount[member.id]++
          }
        }
      }
    } else {
      // Fallback instruments
      for (const instr of ['guitarra', 'violao', 'baixo', 'bateria', 'teclado']) {
        const member = getNextInstrument(instr, blockedSet, assignedThisEvent)
        if (member) {
          assignments.push({ event_id: event.id, member_id: member.id, role: instr })
          assignedThisEvent.add(member.id)
          usageCount[member.id]++
        }
      }
    }

    // Track saturday/sunday for fair distribution rule
    if (dayOfWeekNum === 6) { // Saturday
      assignedThisEvent.forEach(id => saturdayAssigned.add(id))
    } else if (dayOfWeekNum === 0) { // Sunday
      assignedThisEvent.forEach(id => sundayAssigned.add(id))
    }

    // Insert assignments
    if (assignments.length > 0) {
      await serviceClient.from('schedule_assignments').insert(assignments)
    }
  }

  return NextResponse.json({ success: true, eventsCreated: sortedDays.length })
}
