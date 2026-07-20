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

  // Scale type map
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

  // === TRACKING per day-of-week (for round-robin per day type) ===
  // Track which leaders have been used on each day type (5=friday, 6=saturday, 0=sunday)
  const leaderUsedOnDayType: Record<string, string[]> = {
    'male_5': [], // male leaders used on fridays
    'male_6': [], // male leaders used on saturdays
    'male_0': [], // male leaders used on sundays
    'female_5': [],
    'female_6': [],
    'female_0': [],
  }

  // Track which members were assigned on which date (to prevent same person on sat+sun of same week)
  const memberAssignedDates: Record<string, string[]> = {}
  members.forEach(m => { memberAssignedDates[m.id] = [] })

  // Instrument round-robin counters
  const instrumentRR: Record<string, number> = {}
  Object.keys(instrumentPools).forEach(k => { instrumentRR[k] = 0 })

  // Sort days chronologically
  const sortedDays = [...selectedDays].sort((a, b) => a.date.localeCompare(b.date))

  // Group events by week for the sat/sun rule
  function getWeekOfDate(dateStr: string): number {
    const d = new Date(dateStr + 'T12:00:00')
    return Math.ceil(d.getDate() / 7)
  }

  // Helper: check if member was already assigned in the same week on sat or sun
  function wasAssignedSameWeekend(memberId: string, currentDate: string, currentDow: number): boolean {
    if (currentDow !== 0 && currentDow !== 6) return false // Only applies to sat/sun

    const currentWeek = getWeekOfDate(currentDate)
    const assignedDates = memberAssignedDates[memberId] || []

    for (const dateStr of assignedDates) {
      const d = new Date(dateStr + 'T12:00:00')
      const dow = d.getDay()
      const week = getWeekOfDate(dateStr)

      if (week === currentWeek) {
        // If current is sunday(0), check if was on saturday(6) of same week
        if (currentDow === 0 && dow === 6) return true
        // If current is saturday(6), check if was on sunday(0) of same week
        if (currentDow === 6 && dow === 0) return true
      }
    }
    return false
  }

  // Helper: get next leader ensuring round-robin per day type
  function getNextLeader(
    pool: any[],
    genderKey: string,
    dayOfWeekNum: number,
    blockedSet: Set<string>,
    assignedThisEvent: Set<string>,
    currentDate: string
  ): any | null {
    const dayTypeKey = `${genderKey}_${dayOfWeekNum}`
    const usedOnThisDay = leaderUsedOnDayType[dayTypeKey] || []

    // Filter available
    let available = pool.filter(m =>
      !blockedSet.has(m.id) &&
      !assignedThisEvent.has(m.id) &&
      !wasAssignedSameWeekend(m.id, currentDate, dayOfWeekNum)
    )

    if (available.length === 0) {
      // Fallback: allow same weekend if no other option
      available = pool.filter(m =>
        !blockedSet.has(m.id) &&
        !assignedThisEvent.has(m.id)
      )
    }

    if (available.length === 0) return null

    // Prefer leaders who haven't been on this day type yet
    const notYetUsed = available.filter(m => !usedOnThisDay.includes(m.id))

    let chosen: any
    if (notYetUsed.length > 0) {
      chosen = notYetUsed[0]
    } else {
      // All have been used - reset and start over
      leaderUsedOnDayType[dayTypeKey] = []
      chosen = available[0]
    }

    // Track usage
    if (!leaderUsedOnDayType[dayTypeKey]) leaderUsedOnDayType[dayTypeKey] = []
    leaderUsedOnDayType[dayTypeKey].push(chosen.id)

    return chosen
  }

  // Helper: get next female vocal with same rules
  function getNextFemaleVocal(
    blockedSet: Set<string>,
    assignedThisEvent: Set<string>,
    currentDate: string,
    dayOfWeekNum: number,
    preferBack: boolean
  ): any | null {
    const pool = [...femaleLeaders, ...femaleVocals]

    let available = pool.filter(m =>
      !blockedSet.has(m.id) &&
      !assignedThisEvent.has(m.id) &&
      !wasAssignedSameWeekend(m.id, currentDate, dayOfWeekNum)
    )

    if (available.length === 0) {
      available = pool.filter(m =>
        !blockedSet.has(m.id) &&
        !assignedThisEvent.has(m.id)
      )
    }

    if (available.length === 0) return null

    // If preferBack, try to pick a back member first
    if (preferBack) {
      const backs = available.filter(m => m.is_back)
      if (backs.length > 0) return backs[0]
    }

    return available[0]
  }

  function getNextInstrument(instrumentName: string, blockedSet: Set<string>, assignedThisEvent: Set<string>): any | null {
    const key = instrumentName.toLowerCase()
    const pool = instrumentPools[key] || []
    const available = pool.filter((m: any) => !blockedSet.has(m.id) && !assignedThisEvent.has(m.id))
    if (available.length === 0) return null
    const idx = (instrumentRR[key] || 0) % available.length
    instrumentRR[key] = (instrumentRR[key] || 0) + 1
    return available[idx]
  }

  // === GENERATE ===
  for (const day of sortedDays) {
    const dateObj = new Date(day.date + 'T12:00:00')
    const weekNum = Math.ceil(dateObj.getDate() / 7)
    const dayOfWeekNum = dateObj.getDay()

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

    // === VOCALS ===
    if (scaleKind === 'strong_brothers') {
      // 3 male vocals
      const malePool = [...maleLeaders, ...maleVocals]
      for (let i = 0; i < 3; i++) {
        let available = malePool.filter(m =>
          !blockedSet.has(m.id) &&
          !assignedThisEvent.has(m.id) &&
          !wasAssignedSameWeekend(m.id, day.date, dayOfWeekNum)
        )
        if (available.length === 0) {
          available = malePool.filter(m => !blockedSet.has(m.id) && !assignedThisEvent.has(m.id))
        }
        if (available.length > 0) {
          const member = available[0]
          assignments.push({ event_id: event.id, member_id: member.id, role: `vocal_${i + 1}` })
          assignedThisEvent.add(member.id)
          memberAssignedDates[member.id].push(day.date)
        }
      }
    } else if (scaleKind === 'empoderadas') {
      // 3 female vocals
      const femalePool = [...femaleLeaders, ...femaleVocals]
      for (let i = 0; i < 3; i++) {
        let available = femalePool.filter(m =>
          !blockedSet.has(m.id) &&
          !assignedThisEvent.has(m.id) &&
          !wasAssignedSameWeekend(m.id, day.date, dayOfWeekNum)
        )
        if (available.length === 0) {
          available = femalePool.filter(m => !blockedSet.has(m.id) && !assignedThisEvent.has(m.id))
        }
        if (available.length > 0) {
          const member = available[0]
          assignments.push({ event_id: event.id, member_id: member.id, role: `vocal_${i + 1}` })
          assignedThisEvent.add(member.id)
          memberAssignedDates[member.id].push(day.date)
        }
      }
    } else {
      // NORMAL: 1 male leader + 2 female (one should be back)
      const maleLeader = getNextLeader(maleLeaders, 'male', dayOfWeekNum, blockedSet, assignedThisEvent, day.date)
      if (maleLeader) {
        assignments.push({ event_id: event.id, member_id: maleLeader.id, role: 'vocal_1' })
        assignedThisEvent.add(maleLeader.id)
        memberAssignedDates[maleLeader.id].push(day.date)
      }

      // Vocal 2: prefer back member
      const vocal2 = getNextFemaleVocal(blockedSet, assignedThisEvent, day.date, dayOfWeekNum, true)
      if (vocal2) {
        assignments.push({ event_id: event.id, member_id: vocal2.id, role: 'vocal_2' })
        assignedThisEvent.add(vocal2.id)
        memberAssignedDates[vocal2.id].push(day.date)
      }

      // Vocal 3: any female
      const vocal3 = getNextFemaleVocal(blockedSet, assignedThisEvent, day.date, dayOfWeekNum, false)
      if (vocal3) {
        assignments.push({ event_id: event.id, member_id: vocal3.id, role: 'vocal_3' })
        assignedThisEvent.add(vocal3.id)
        memberAssignedDates[vocal3.id].push(day.date)
      }
    }

    // === INSTRUMENTS ===
    const instrumentPatterns = bandPattern.filter((bp: any) => !bp.is_vocal && bp.instrument)

    if (instrumentPatterns.length > 0) {
      for (const ip of instrumentPatterns) {
        const instrName = ip.instrument.name.toLowerCase()
        for (let q = 0; q < ip.quantity; q++) {
          const member = getNextInstrument(instrName, blockedSet, assignedThisEvent)
          if (member) {
            assignments.push({ event_id: event.id, member_id: member.id, role: instrName })
            assignedThisEvent.add(member.id)
            memberAssignedDates[member.id].push(day.date)
          }
        }
      }
    } else {
      for (const instr of ['guitarra', 'violao', 'baixo', 'bateria', 'teclado']) {
        const member = getNextInstrument(instr, blockedSet, assignedThisEvent)
        if (member) {
          assignments.push({ event_id: event.id, member_id: member.id, role: instr })
          assignedThisEvent.add(member.id)
          memberAssignedDates[member.id].push(day.date)
        }
      }
    }

    // Insert assignments
    if (assignments.length > 0) {
      await serviceClient.from('schedule_assignments').insert(assignments)
    }
  }

  return NextResponse.json({ success: true, eventsCreated: sortedDays.length })
}
