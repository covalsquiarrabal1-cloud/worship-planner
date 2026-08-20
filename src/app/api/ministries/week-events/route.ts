import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!start || !end) {
    return NextResponse.json({ error: 'start e end obrigatórios' }, { status: 400 })
  }

  const serviceClient = await createServiceRoleClient()

  // Get all ministries
  const { data: ministries } = await serviceClient
    .from('ministries')
    .select('id, name, slug')
    .order('name')

  if (!ministries) return NextResponse.json([])

  const result = []

  for (const ministry of ministries) {
    // Get events for this ministry in the date range
    const { data: events } = await serviceClient
      .from('ministry_events')
      .select(`
        id, event_date, day_of_week, scale_name, num_celebrations,
        assignments:ministry_assignments(
          id, celebration_number, role_name,
          member:ministry_members(id, name, nickname)
        )
      `)
      .eq('ministry_id', ministry.id)
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date')

    if (events && events.length > 0) {
      result.push({
        id: ministry.id,
        name: ministry.name,
        slug: ministry.slug,
        events: events,
      })
    }
  }

  return NextResponse.json(result)
}
