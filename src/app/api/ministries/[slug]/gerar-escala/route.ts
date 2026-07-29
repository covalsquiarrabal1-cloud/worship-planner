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
    return NextResponse.json({ error: 'Nenhum membro cadastrado neste ministério' }, { status: 400 })
  }

  // --- Check conflicts with main worship schedule ---
  // Get all dates we'll be scheduling
  const allDates = selectedDays.map(d => d.date)

  // Get main schedule events for those dates
  const { data: mainEvents } = await serviceClient
    .from('schedule_events')
    .select(`
      id, event_date,
      assignments:schedule_assignments(
        id, role,
        member:members(id, name, email)
      )
    `)
    .in('event_date', allDates)

  // Build a map: date -> set of emails that are busy in the main schedule
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
    await serviceClient.from('ministry_events').delete().eq('schedule_id', scheduleId)
  } else {
    const { data: newSchedule, error: schedErr } = await serviceClient
      .from('ministry_schedules')
      .insert({ ministry_id: ministry.id, month, year, is_published: true })
      .select('id')
      .single()
    if (schedErr || !newSchedule) {
      return NextResponse.json({ error: 'Erro ao criar schedule: ' + schedErr?.message }, { status: 500 })
    }
    scheduleId = newSchedule.id
  }

  // Round-robin assignment
  let memberIndex = 0
  const sortedDays = [...selectedDays].sort((a, b) => a.date.localeCompare(b.date))
  const conflicts: string[] = []

  for (const day of sortedDays) {
    const dateObj = new Date(day.date + 'T12:00:00')
    const weekNum = Math.ceil(dateObj.getDate() / 7)
    const numCelebrations = day.numCelebrations || 1

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
      .select('id')
      .single()

    if (eventErr || !event) continue

    // Assign one person per celebration (round-robin, skipping members busy in main schedule)
    const assignments: { event_id: string; member_id: string; celebration_number: number }[] = []
    const busyEmails = busyByDate[day.date] || new Set()

    for (let c = 1; c <= numCelebrations; c++) {
      let assigned = false
      let attempts = 0

      // Try to find a member not busy in the main schedule
      while (!assigned && attempts < members.length) {
        const member = members[memberIndex % members.length]
        const memberEmail = member.email?.toLowerCase() || ''
        memberIndex++
        attempts++

        // Skip if this member is in the main worship schedule for this date
        if (memberEmail && busyEmails.has(memberEmail)) {
          const dateFormatted = day.date.slice(8,10) + '/' + day.date.slice(5,7)
          conflicts.push(`${member.name} já está escalado(a) no louvor dia ${dateFormatted}`)
          continue
        }

        assignments.push({
          event_id: event.id,
          member_id: member.id,
          celebration_number: c,
        })
        assigned = true
      }

      // If all members are busy, assign the next in round-robin anyway
      if (!assigned) {
        const member = members[memberIndex % members.length]
        assignments.push({
          event_id: event.id,
          member_id: member.id,
          celebration_number: c,
        })
        memberIndex++
      }
    }

    if (assignments.length > 0) {
      await serviceClient.from('ministry_assignments').insert(assignments)
    }
  }

  return NextResponse.json({ success: true, eventsCreated: sortedDays.length, conflicts })
}
