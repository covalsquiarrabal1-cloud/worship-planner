import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!start || !end) return NextResponse.json({ error: 'start e end obrigatórios' }, { status: 400 })

  const serviceClient = await createServiceRoleClient()
  let myEvents: any[] = []

  // Allow admin to query another member's schedule by email
  const memberEmail = searchParams.get('memberEmail')
  let targetEmail = user.email || ''

  if (memberEmail) {
    // Verify caller is admin
    const { data: profile } = await serviceClient
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'admin') {
      targetEmail = memberEmail
    }
  }

  // === 1. Ministry schedule events ===
  const { data: myMemberships } = await serviceClient
    .from('ministry_members')
    .select('id, ministry_id, name')
    .ilike('email', targetEmail)

  if (myMemberships && myMemberships.length > 0) {
    const memberIds = myMemberships.map(m => m.id)
    const ministryIds = [...new Set(myMemberships.map(m => m.ministry_id))]

    const { data: ministries } = await serviceClient
      .from('ministries')
      .select('id, name, slug')
      .in('id', ministryIds)

    const ministryMap = new Map((ministries || []).map(m => [m.id, m]))

    const { data: schedules } = await serviceClient
      .from('ministry_schedules')
      .select('id, ministry_id, month, year, is_published')
      .in('ministry_id', ministryIds)
      .eq('is_published', true)

    if (schedules && schedules.length > 0) {
      const scheduleIds = schedules.map(s => s.id)
      const scheduleMinistryMap = new Map(schedules.map(s => [s.id, s.ministry_id]))

      const { data: events } = await serviceClient
        .from('ministry_events')
        .select(`
          id, event_date, day_of_week, week_number, scale_name, num_celebrations, schedule_id,
          assignments:ministry_assignments(
            id, celebration_number, member_id,
            member:ministry_members(id, name)
          )
        `)
        .in('schedule_id', scheduleIds)
        .gte('event_date', start)
        .lte('event_date', end)
        .order('event_date')

      if (events) {
        myEvents = events
          .filter(event => {
            const assignments = (event.assignments as any[]) || []
            return assignments.some(a => memberIds.includes(a.member_id))
          })
          .map(event => {
            const ministryId = scheduleMinistryMap.get(event.schedule_id)
            const ministry = ministryId ? ministryMap.get(ministryId) : null
            return {
              ...event,
              ministry_name: ministry?.name || '',
              ministry_slug: ministry?.slug || '',
            }
          })
      }
    }
  }

  // === 2. Momentos events (independent of ministry membership) ===
  const { data: myMomentosMembers } = await serviceClient
    .from('momentos_members')
    .select('id')
    .ilike('email', targetEmail)

  const momentosMemberIds = (myMomentosMembers || []).map(m => m.id)

  if (momentosMemberIds.length > 0) {
    const { data: myMomentos } = await serviceClient
      .from('ministry_momentos')
      .select('id, event_date, culto, momento, member_id, ministry_id')
      .in('member_id', momentosMemberIds)
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date')

    if (myMomentos && myMomentos.length > 0) {
      const momentosMinistryIds = [...new Set(myMomentos.map(m => m.ministry_id))]
      const { data: momentosMinistries } = await serviceClient
        .from('ministries')
        .select('id, name, slug')
        .in('id', momentosMinistryIds)

      const momMinMap = new Map((momentosMinistries || []).map(m => [m.id, m]))

      const momentosEvents = myMomentos.map(m => {
        const ministry = momMinMap.get(m.ministry_id)
        return {
          id: m.id,
          event_date: m.event_date,
          day_of_week: 'Domingo',
          week_number: 0,
          scale_name: `${m.momento} - ${m.culto}`,
          num_celebrations: 1,
          ministry_name: 'Momentos',
          ministry_slug: ministry?.slug || 'intercessao-alive',
          assignments: [{
            id: m.id,
            celebration_number: 1,
            member_id: m.member_id,
            member: { id: m.member_id, name: m.momento },
          }],
        }
      })

      myEvents = [...myEvents, ...momentosEvents]
    }
  }

  return NextResponse.json(myEvents)
}
