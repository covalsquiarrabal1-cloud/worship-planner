import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()

  const { data: ministry } = await serviceClient
    .from('ministries').select('id, leader_user_id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && ministry.leader_user_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { month, year } = await request.json()

  // Get members
  const { data: members } = await serviceClient
    .from('ministry_members')
    .select('id, name, email')
    .eq('ministry_id', ministry.id)
    .eq('is_blocked', false)
    .order('name')

  if (!members || members.length === 0) {
    return NextResponse.json({ error: 'Nenhum membro cadastrado neste ministério' }, { status: 400 })
  }

  // Get schedule
  const { data: schedule } = await serviceClient
    .from('ministry_schedules')
    .select('id')
    .eq('ministry_id', ministry.id)
    .eq('month', month)
    .eq('year', year)
    .single()

  if (!schedule) return NextResponse.json({ error: 'Nenhuma escala encontrada' }, { status: 400 })

  // Get events
  const { data: events } = await serviceClient
    .from('ministry_events')
    .select('id, event_date, num_celebrations, scale_name')
    .eq('schedule_id', schedule.id)
    .order('event_date')

  if (!events || events.length === 0) {
    return NextResponse.json({ error: 'Nenhum evento encontrado' }, { status: 400 })
  }

  // Check which events already have assignments
  const eventIds = events.map(e => e.id)
  const { data: existingAssignments } = await serviceClient
    .from('ministry_assignments')
    .select('event_id')
    .in('event_id', eventIds)

  const eventsWithAssignments = new Set((existingAssignments || []).map(a => a.event_id))

  // Get scale config for how many people per event
  const { data: scaleConfigs } = await serviceClient
    .from('ministry_scale_config')
    .select('scale_name, num_people')
    .eq('ministry_id', ministry.id)

  const configMap: Record<string, number> = {}
  for (const cfg of scaleConfigs || []) {
    configMap[cfg.scale_name] = cfg.num_people
  }

  // Check louvor conflicts
  const allDates = events.map(e => e.event_date)
  const { data: mainEvents } = await serviceClient
    .from('schedule_events')
    .select(`id, event_date, assignments:schedule_assignments(member:members(email))`)
    .in('event_date', allDates)

  const busyByDate: Record<string, Set<string>> = {}
  for (const ev of mainEvents || []) {
    if (!busyByDate[ev.event_date]) busyByDate[ev.event_date] = new Set()
    for (const a of (ev.assignments as any[]) || []) {
      const email = a.member?.email?.toLowerCase()
      if (email) busyByDate[ev.event_date].add(email)
    }
  }

  // Round-robin assignment with random start position
  let memberIndex = Math.floor(Math.random() * members.length)
  let totalAssigned = 0

  for (const event of events) {
    // Clear existing assignments for this event
    await serviceClient.from('ministry_assignments').delete().eq('event_id', event.id)

    const numPeople = configMap[(event as any).scale_name] || configMap['default'] || 1
    const busyEmails = busyByDate[event.event_date] || new Set()
    const assignments: { event_id: string; member_id: string; celebration_number: number; role: string; role_name: string }[] = []

    for (let c = 1; c <= (event.num_celebrations || 1); c++) {
      const assignedThisCelebration = new Set<string>()

      for (let p = 0; p < numPeople; p++) {
        let attempts = 0
        while (attempts < members.length) {
          const member = members[memberIndex % members.length]
          memberIndex++
          attempts++

          if (assignedThisCelebration.has(member.id)) continue
          const email = member.email?.toLowerCase() || ''
          if (email && busyEmails.has(email)) continue

          assignments.push({
            event_id: event.id,
            member_id: member.id,
            celebration_number: c,
            role: 'operator',
            role_name: 'Membro',
          })
          assignedThisCelebration.add(member.id)
          break
        }
      }
    }

    if (assignments.length > 0) {
      await serviceClient.from('ministry_assignments').insert(assignments)
      totalAssigned += assignments.length
    }
  }

  return NextResponse.json({ success: true, totalAssigned })
}
