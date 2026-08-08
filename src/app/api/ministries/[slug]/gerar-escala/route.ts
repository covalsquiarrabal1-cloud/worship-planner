import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

interface SelectedDay {
  date: string
  dayOfWeek: string
  scaleName: string
  numCelebrations: number
}

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

  // Check permission
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && ministry.leader_user_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { month, year, selectedDays } = await request.json() as {
    month: number; year: number; selectedDays: SelectedDay[]
  }

  if (!selectedDays || selectedDays.length === 0) {
    return NextResponse.json({ error: 'Nenhum dia selecionado' }, { status: 400 })
  }

  // Load members
  const { data: membersData } = await serviceClient
    .from('ministry_members')
    .select('*')
    .eq('ministry_id', ministry.id)
    .eq('is_blocked', false)
    .order('name')

  const members = membersData || []
  if (members.length === 0) {
    return NextResponse.json({ error: 'Nenhum membro cadastrado' }, { status: 400 })
  }

  // Check conflicts with main worship schedule
  const allDates = selectedDays.map(d => d.date)
  const { data: mainEvents } = await serviceClient
    .from('schedule_events')
    .select(`id, event_date, assignments:schedule_assignments(id, role, member:members(id, name, email))`)
    .in('event_date', allDates)

  const busyByDate: Record<string, Set<string>> = {}
  for (const event of mainEvents || []) {
    if (!busyByDate[event.event_date]) busyByDate[event.event_date] = new Set()
    for (const assignment of (event.assignments as any[]) || []) {
      const email = assignment.member?.email?.toLowerCase()
      if (email) busyByDate[event.event_date].add(email)
    }
  }

  // Get or create schedule
  const { data: existingSchedule } = await serviceClient
    .from('ministry_schedules')
    .select('id')
    .eq('ministry_id', ministry.id)
    .eq('month', month)
    .eq('year', year)
    .single()

  let scheduleId: string
  if (existingSchedule) {
    scheduleId = existingSchedule.id
    const { data: oldEvents } = await serviceClient
      .from('ministry_events').select('id').eq('schedule_id', scheduleId)
    if (oldEvents && oldEvents.length > 0) {
      await serviceClient.from('ministry_assignments').delete().in('event_id', oldEvents.map(e => e.id))
    }
    await serviceClient.from('ministry_events').delete().eq('schedule_id', scheduleId)
  } else {
    const { data: newSchedule, error: schedErr } = await serviceClient
      .from('ministry_schedules')
      .insert({ ministry_id: ministry.id, month, year, is_published: true })
      .select('id').single()
    if (schedErr || !newSchedule) {
      return NextResponse.json({ error: 'Erro ao criar schedule: ' + schedErr?.message }, { status: 500 })
    }
    scheduleId = newSchedule.id
  }

  const sortedDays = [...selectedDays].sort((a, b) => a.date.localeCompare(b.date))
  const conflicts: string[] = []

  // === INTERCESSÃO: Role-based generation ===
  if (slug === 'intercessao' || slug === 'intercessao-alive') {
    // Load member roles
    const { data: memberRoles } = await serviceClient
      .from('intercessao_member_roles')
      .select('member_id, role_type')

    // Load event config
    const { data: eventConfigs } = await serviceClient
      .from('intercessao_event_config')
      .select('scale_name, role_type, num_people, gender_filter')

    if (!eventConfigs || eventConfigs.length === 0) {
      return NextResponse.json({
        error: 'Configuração de eventos não encontrada. Configure em CONFIG primeiro.'
      }, { status: 400 })
    }

    // Build role map: member_id -> role_types[]
    const roleMap: Record<string, string[]> = {}
    for (const r of memberRoles || []) {
      if (!roleMap[r.member_id]) roleMap[r.member_id] = []
      roleMap[r.member_id].push(r.role_type)
    }

    // Build config map: scale_name -> { role_type: { num_people, gender_filter } }
    const configMap: Record<string, Record<string, { num_people: number; gender_filter: string }>> = {}
    for (const cfg of eventConfigs) {
      if (!configMap[cfg.scale_name]) configMap[cfg.scale_name] = {}
      configMap[cfg.scale_name][cfg.role_type] = {
        num_people: cfg.num_people,
        gender_filter: cfg.gender_filter,
      }
    }

    // Round-robin trackers per role
    const roleCounters: Record<string, number> = {
      torre_domingo: 0, torre_sexta: 0, torre_strong: 0, torre_empoderadas: 0,
      intercessor: 0, coluna: 0, suporte: 0,
    }

    // Get members eligible for each role (filtered by gender when needed)
    function getEligibleMembers(roleType: string, genderFilter: string): any[] {
      return members.filter(m => {
        const roles = roleMap[m.id] || []
        if (!roles.includes(roleType)) return false
        if (genderFilter === 'male' && m.gender !== 'male') return false
        if (genderFilter === 'female' && m.gender !== 'female') return false
        return true
      })
    }

    // Determine torre role key based on scale
    function getTorreKey(scaleName: string, dayOfWeek: string): string {
      const upper = scaleName.toUpperCase()
      if (upper.includes('STRONG')) return 'torre_strong'
      if (upper.includes('EMPODERADA')) return 'torre_empoderadas'
      if (dayOfWeek.toLowerCase().includes('domingo')) return 'torre_domingo'
      return 'torre_sexta'
    }

    for (const day of sortedDays) {
      const dateObj = new Date(day.date + 'T12:00:00')
      const weekNum = Math.ceil(dateObj.getDate() / 7)
      const numCelebrations = day.numCelebrations || 1
      const scaleName = (day.scaleName || '').toUpperCase()

      // Find matching config
      let config = configMap[scaleName]
      if (!config) {
        // Try partial match
        const matchKey = Object.keys(configMap).find(k => scaleName.includes(k) || k.includes(scaleName))
        if (matchKey) config = configMap[matchKey]
      }
      if (!config) config = configMap['CELEBRAÇÃO'] || {}

      // Create event
      const { data: event, error: eventErr } = await serviceClient
        .from('ministry_events')
        .insert({
          schedule_id: scheduleId,
          event_date: day.date,
          day_of_week: day.dayOfWeek,
          week_number: weekNum,
          scale_name: day.scaleName || null,
          num_celebrations: numCelebrations,
        })
        .select('id').single()

      if (eventErr || !event) continue

      const assignments: { event_id: string; member_id: string; celebration_number: number; role: string; role_name: string }[] = []
      const assignedThisEvent = new Set<string>()
      const busyEmails = busyByDate[day.date] || new Set()

      // Pre-select Torre for the event (same Torre for all celebrations)
      const torreConfig = config['torre']
      let selectedTorreId: string | null = null
      if (torreConfig && torreConfig.num_people > 0) {
        const torreKey = getTorreKey(day.scaleName || '', day.dayOfWeek)
        const torreEligible = getEligibleMembers(torreKey, torreConfig.gender_filter)
        if (torreEligible.length > 0) {
          // Find a torre not busy
          let found = false
          for (let a = 0; a < torreEligible.length; a++) {
            const candidate = torreEligible[roleCounters[torreKey] % torreEligible.length]
            roleCounters[torreKey] = (roleCounters[torreKey] || 0) + 1
            const email = candidate.email?.toLowerCase() || ''
            if (email && busyEmails.has(email)) continue
            selectedTorreId = candidate.id
            found = true
            break
          }
          if (!found && torreEligible.length > 0) {
            selectedTorreId = torreEligible[0].id
          }
        }
      }

      // For each celebration
      for (let c = 1; c <= numCelebrations; c++) {
        const assignedThisCelebration = new Set<string>()

        // Assign Torre first (same for all celebrations)
        if (selectedTorreId) {
          assignments.push({
            event_id: event.id,
            member_id: selectedTorreId,
            celebration_number: c,
            role: 'operator',
            role_name: 'Torre',
          })
          assignedThisCelebration.add(selectedTorreId)
        }

        // Process remaining roles: intercessor, coluna, suporte
        // These CANNOT repeat between celebrations on the same day
        const roleOrder = ['intercessor', 'coluna', 'suporte']

        for (const baseRole of roleOrder) {
          const roleConfig = config[baseRole]
          if (!roleConfig || roleConfig.num_people <= 0) continue

          const genderFilter = roleConfig.gender_filter
          const numPeople = roleConfig.num_people >= 99
            ? 999 // "all" mode
            : roleConfig.num_people

          const roleKey = baseRole
          const eligible = getEligibleMembers(roleKey, genderFilter)
          if (eligible.length === 0) continue

          // For "all" mode (99+), assign everyone eligible
          const count = numPeople >= 999 ? eligible.length : numPeople

          let assigned = 0
          let attempts = 0
          const maxAttempts = eligible.length * 2

          while (assigned < count && attempts < maxAttempts) {
            const counterKey = roleKey
            const member = eligible[roleCounters[counterKey] % eligible.length]
            roleCounters[counterKey] = (roleCounters[counterKey] || 0) + 1
            attempts++

            // Skip if already assigned in this celebration
            if (assignedThisCelebration.has(member.id)) continue

            // Skip if already assigned in another celebration of the same event
            // (intercessors, coluna, suporte cannot repeat between C1 and C2)
            if (assignedThisEvent.has(member.id)) continue

            // Skip if busy in main schedule
            const memberEmail = member.email?.toLowerCase() || ''
            if (memberEmail && busyEmails.has(memberEmail)) {
              const dateFormatted = day.date.slice(8, 10) + '/' + day.date.slice(5, 7)
              conflicts.push(`${member.name} já está no louvor dia ${dateFormatted}`)
              continue
            }

            const roleName = baseRole === 'intercessor' ? 'Intercessor'
              : baseRole === 'coluna' ? 'Coluna'
              : 'Suporte'

            assignments.push({
              event_id: event.id,
              member_id: member.id,
              celebration_number: c,
              role: 'operator',
              role_name: roleName,
            })
            assignedThisCelebration.add(member.id)
            assignedThisEvent.add(member.id)
            assigned++
          }
        }
      }

      if (assignments.length > 0) {
        await serviceClient.from('ministry_assignments').insert(assignments)
      }
    }

    return NextResponse.json({ success: true, eventsCreated: sortedDays.length, conflicts })
  }

  // === GENERIC MINISTRIES: Simple round-robin ===
  let memberIndex = 0

  const { data: scaleConfigs } = await serviceClient
    .from('ministry_scale_config')
    .select('scale_name, num_people')
    .eq('ministry_id', ministry.id)

  const genericConfigMap: Record<string, number> = {}
  for (const cfg of scaleConfigs || []) {
    genericConfigMap[cfg.scale_name] = cfg.num_people
  }

  for (const day of sortedDays) {
    const dateObj = new Date(day.date + 'T12:00:00')
    const weekNum = Math.ceil(dateObj.getDate() / 7)
    const numCelebrations = day.numCelebrations || 1

    const { data: event, error: eventErr } = await serviceClient
      .from('ministry_events')
      .insert({
        schedule_id: scheduleId,
        event_date: day.date,
        day_of_week: day.dayOfWeek,
        week_number: weekNum,
        scale_name: day.scaleName || null,
        num_celebrations: numCelebrations,
      })
      .select('id').single()

    if (eventErr || !event) continue

    const numPeople = genericConfigMap[day.scaleName] || 1
    const assignments: { event_id: string; member_id: string; celebration_number: number }[] = []
    const busyEmails = busyByDate[day.date] || new Set()

    for (let c = 1; c <= numCelebrations; c++) {
      for (let p = 0; p < numPeople; p++) {
        let assigned = false
        let attempts = 0
        while (!assigned && attempts < members.length) {
          const member = members[memberIndex % members.length]
          const memberEmail = member.email?.toLowerCase() || ''
          memberIndex++
          attempts++
          if (memberEmail && busyEmails.has(memberEmail)) {
            const dateFormatted = day.date.slice(8, 10) + '/' + day.date.slice(5, 7)
            conflicts.push(`${member.name} já está no louvor dia ${dateFormatted}`)
            continue
          }
          assignments.push({ event_id: event.id, member_id: member.id, celebration_number: c })
          assigned = true
        }
        if (!assigned) {
          const member = members[memberIndex % members.length]
          assignments.push({ event_id: event.id, member_id: member.id, celebration_number: c })
          memberIndex++
        }
      }
    }

    if (assignments.length > 0) {
      await serviceClient.from('ministry_assignments').insert(assignments)
    }
  }

  return NextResponse.json({ success: true, eventsCreated: sortedDays.length, conflicts })
}
