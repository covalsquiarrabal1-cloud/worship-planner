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

  const { data, error } = await serviceClient
    .from('schedule_events')
    .select(`
      id,
      event_date,
      day_of_week,
      week_number,
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
