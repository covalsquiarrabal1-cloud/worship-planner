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
        member:members(id, name)
      ),
      songs(id, order_num, title, version, minister, youtube_url)
    `)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date')

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If not admin, filter to only published schedules
  if (!isAdmin && data) {
    const scheduleIds = [...new Set(data.map((e: any) => e.schedule_id))]
    const { data: schedules } = await serviceClient
      .from('schedules')
      .select('id, is_published')
      .in('id', scheduleIds)
    
    const publishedIds = new Set((schedules || []).filter((s: any) => s.is_published).map((s: any) => s.id))
    const filtered = data.filter((e: any) => publishedIds.has(e.schedule_id))
    return NextResponse.json(filtered)
  }

  return NextResponse.json(data)
}
