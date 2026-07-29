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

  // Find all ministry_members records with the user's email
  const { data: myMemberships } = await serviceClient
    .from('ministry_members')
    .select('id, ministry_id, name')
    .ilike('email', user.email || '')

  if (!myMemberships || myMemberships.length === 0) {
    return NextResponse.json([])
  }

  const memberIds = myMemberships.map(m => m.id)
  const ministryIds = [...new Set(myMemberships.map(m => m.ministry_id))]

  // Get ministries info
  const { data: ministries } = await serviceClient
    .from('ministries')
    .select('id, name, slug')
    .in('id', ministryIds)

  const ministryMap = new Map((ministries || []).map(m => [m.id, m]))

  // Get published schedules for those ministries
  const { data: schedules } = await serviceClient
    .from('ministry_schedules')
    .select('id, ministry_id, month, year, is_published')
    .in('ministry_id', ministryIds)
    .eq('is_published', true)

  if (!schedules || schedules.length === 0) {
    return NextResponse.json([])
  }

  const scheduleIds = schedules.map(s => s.id)
  const scheduleMinistryMap = new Map(schedules.map(s => [s.id, s.ministry_id]))

  // Get events in date range from those schedules
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

  if (!events) return NextResponse.json([])

  // Filter events where this member is assigned
  const myEvents = events
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

  return NextResponse.json(myEvents)
}
