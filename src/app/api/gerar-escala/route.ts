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

  // Scale type map (with vocal counts)
  const uniqueNames = [...new Set(selectedDays.map(d => d.scaleName).filter(Boolean))]
  const scaleTypeMap: Record<string, string> = {}
  const scaleTypeVocals: Record<string, { male: number; female: number }> = {}
  for (const name of uniqueNames) {
    const existing = scaleTypes.find((st: any) => st.name === name)
    if (existing) {
      scaleTypeMap[name] = existing.id
      scaleTypeVocals[name] = {
        male: existing.male_vocals ?? 1,
        female: existing.female_vocals ?? 2,
      }
    } else {
      const { data: created } = await serviceClient
        .from('scale_types')
        .insert({ name, type: 'normal' })
        .select('*')
        .single()
      if (created) {
        scaleTypeMap[name] = created.id
        scaleTypeVocals[name] = {
          male: created.male_vocals ?? 1,
          female: created.female_vocals ?? 2,
        }
      }
    }
  }

  function getVocalCounts(scaleName: string): { male: number; female: number } {
    return scaleTypeVocals[scaleName] || { male: 1, female: 2 }
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
  // === TRACKING ===
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

  // Helper: check if member was already assigned in the same week on adjacent days (fri+sat or sat+sun)
  function wasAssignedSameWeekend(memberId: string, currentDate: string, currentDow: number): boolean {
    // Rule: don't assign same person on fri+sat or sat+sun of same week
    if (currentDow !== 0 && currentDow !== 5 && currentDow !== 6) return false

    const currentWeek = getWeekOfDate(currentDate)
    const assignedDates = memberAssignedDates[memberId] || []

    for (const dateStr of assignedDates) {
      const d = new Date(dateStr + 'T12:00:00')
      const dow = d.getDay()
      const week = getWeekOfDate(dateStr)

      if (week === currentWeek) {
        // Friday(5): check if was on Saturday(6)
        if (currentDow === 5 && dow === 6) return true
        // Saturday(6): check if was on Friday(5) or Sunday(0)
        if (currentDow === 6 && (dow === 5 || dow === 0)) return true
        // Sunday(0): check if was on Saturday(6)
        if (currentDow === 0 && dow === 6) return true
      }
    }
    return false
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
    const vocalCounts = day.scaleName ? getVocalCounts(day.scaleName) : { male: 1, female: 2 }

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
    // Assign male vocals based on male_vocals count
    const malePool = [...maleLeaders, ...maleVocals]
    for (let i = 0; i < vocalCounts.male; i++) {
      let available = malePool.filter(m =>
        !blockedSet.has(m.id) &&
        !assignedThisEvent.has(m.id) &&
        !wasAssignedSameWeekend(m.id, day.date, dayOfWeekNum)
      )
      if (available.length === 0) {
        available = malePool.filter(m => !blockedSet.has(m.id) && !assignedThisEvent.has(m.id))
      }

      if (available.length > 0) {
        // Prefer leaders first, then sort by least used
        available.sort((a, b) => {
          if (a.is_leader && !b.is_leader) return -1
          if (!a.is_leader && b.is_leader) return 1
          const aCount = (memberAssignedDates[a.id] || []).length
          const bCount = (memberAssignedDates[b.id] || []).length
          return aCount - bCount
        })
        const member = available[0]
        const vocalIndex = assignments.filter(a => a.role.startsWith('vocal_')).length + 1
        assignments.push({ event_id: event.id, member_id: member.id, role: `vocal_${vocalIndex}` })
        assignedThisEvent.add(member.id)
        memberAssignedDates[member.id].push(day.date)
      }
    }

    // Assign female vocals based on female_vocals count
    const femalePool = [...femaleLeaders, ...femaleVocals]
    for (let i = 0; i < vocalCounts.female; i++) {
      let available = femalePool.filter(m =>
        !blockedSet.has(m.id) &&
        !assignedThisEvent.has(m.id) &&
        !wasAssignedSameWeekend(m.id, day.date, dayOfWeekNum)
      )
      if (available.length === 0) {
        available = femalePool.filter(m => !blockedSet.has(m.id) && !assignedThisEvent.has(m.id))
      }

      if (available.length > 0) {
        // Prefer backs first for the first female slot, then sort by least used
        available.sort((a, b) => {
          if (i === 0) {
            if (a.is_back && !b.is_back) return -1
            if (!a.is_back && b.is_back) return 1
          }
          const aCount = (memberAssignedDates[a.id] || []).length
          const bCount = (memberAssignedDates[b.id] || []).length
          return aCount - bCount
        })
        const member = available[0]
        const vocalIndex = assignments.filter(a => a.role.startsWith('vocal_')).length + 1
        assignments.push({ event_id: event.id, member_id: member.id, role: `vocal_${vocalIndex}` })
        assignedThisEvent.add(member.id)
        memberAssignedDates[member.id].push(day.date)
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
