import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start')
  const endDate = searchParams.get('end')

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'start e end são obrigatórios' }, { status: 400 })
  }

  // Check if user is admin
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  // Get all schedules for the date range to determine which is most recent
  const { data: schedules } = await serviceClient
    .from('schedules')
    .select('id, is_published, created_at')
    .order('created_at', { ascending: false })

  // Build query
  let query = serviceClient
    .from('schedule_events')
    .select(`
      id,
      event_date,
      day_of_week,
      week_number,
      schedule_id,
      scale_type:scale_types(id, name, type),
      assignments:schedule_assignments(
        id,
        role,
        member:members(id, name, email, nickname)
      ),
      songs(id, order_num, title, version, minister, youtube_url)
    `)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date')

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data) return NextResponse.json([])

  // If not admin, filter to only published schedules
  if (!isAdmin) {
    const eventScheduleIds = [...new Set(data.map((e: any) => e.schedule_id))]
    const publishedIds = new Set(
      (schedules || [])
        .filter((s: any) => s.is_published && eventScheduleIds.includes(s.id))
        .map((s: any) => s.id)
    )
    const filtered = data.filter((e: any) => publishedIds.has(e.schedule_id))

    // Deduplicate: if multiple events exist for the same date + scale_type,
    // keep the one from the most recent schedule (has more data like songs)
    const deduped = deduplicateEvents(filtered, schedules || [])
    return NextResponse.json(deduped)
  }

  // For admin: deduplicate events keeping the most recent schedule's version
  const deduped = deduplicateEvents(data, schedules || [])
  return NextResponse.json(deduped)
}

// When multiple schedules exist for the same month, there may be duplicate events
// (same date + same scale_type). Keep the one from the most recent schedule.
function deduplicateEvents(events: any[], schedules: any[]): any[] {
  // Build a map of schedule_id -> creation order (higher = more recent)
  const scheduleOrder = new Map<string, number>()
  // schedules are already sorted by created_at DESC, so index 0 is most recent
  schedules.forEach((s, idx) => {
    scheduleOrder.set(s.id, schedules.length - idx) // higher number = more recent
  })

  const eventMap = new Map<string, any>()

  for (const event of events) {
    const key = `${event.event_date}_${event.scale_type?.id || 'null'}`
    const existing = eventMap.get(key)

    if (!existing) {
      eventMap.set(key, event)
    } else {
      // Keep the one from the more recent schedule
      const existingOrder = scheduleOrder.get(existing.schedule_id) || 0
      const currentOrder = scheduleOrder.get(event.schedule_id) || 0
      if (currentOrder > existingOrder) {
        eventMap.set(key, event)
      }
    }
  }

  // Return sorted by event_date
  return Array.from(eventMap.values()).sort((a, b) => a.event_date.localeCompare(b.event_date))
}
