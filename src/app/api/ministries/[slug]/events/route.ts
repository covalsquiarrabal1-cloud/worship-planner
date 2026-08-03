import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()

  const { data: ministry } = await serviceClient
    .from('ministries').select('id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!start || !end) return NextResponse.json({ error: 'start e end obrigatórios' }, { status: 400 })

  // Check if user is admin or leader
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  const { data: ministryFull } = await serviceClient
    .from('ministries').select('leader_user_id').eq('id', ministry.id).single()
  const isAdminOrLeader = profile?.role === 'admin' || ministryFull?.leader_user_id === user.id

  const { data, error } = await serviceClient
    .from('ministry_events')
    .select(`
      id, event_date, day_of_week, week_number, scale_name, num_celebrations,
      schedule_id,
      assignments:ministry_assignments(
        id, celebration_number, role, role_name,
        member:ministry_members(id, name, nickname)
      )
    `)
    .gte('event_date', start)
    .lte('event_date', end)
    .order('event_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter by ministry schedule
  const { data: schedules } = await serviceClient
    .from('ministry_schedules')
    .select('id, is_published')
    .eq('ministry_id', ministry.id)

  const scheduleIds = new Set((schedules || []).map((s: any) => s.id))
  const publishedIds = new Set((schedules || []).filter((s: any) => s.is_published).map((s: any) => s.id))

  let filtered = (data || []).filter((e: any) => scheduleIds.has(e.schedule_id))

  // If not admin/leader, only show published
  if (!isAdminOrLeader) {
    filtered = filtered.filter((e: any) => publishedIds.has(e.schedule_id))
  }

  return NextResponse.json(filtered)
}
