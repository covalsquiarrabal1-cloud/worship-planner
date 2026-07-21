import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event_id')

  if (eventId) {
    const { data, error } = await serviceClient
      .from('songs')
      .select('*')
      .eq('event_id', eventId)
      .order('order_num')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Return all songs for a date range
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (start && end) {
    const { data, error } = await serviceClient
      .from('schedule_events')
      .select(`
        id, event_date, day_of_week,
        scale_type:scale_types(name),
        songs(id, order_num, title, version, minister, youtube_url)
      `)
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Parâmetros obrigatórios' }, { status: 400 })
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { event_id, title, youtube_url, order_num, version, minister } = body

  if (!event_id || !title) {
    return NextResponse.json({ error: 'event_id e title são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await serviceClient
    .from('songs')
    .insert({
      event_id,
      title,
      youtube_url: youtube_url || null,
      order_num: order_num || 1,
      version: version || null,
      minister: minister || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { error } = await serviceClient.from('songs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
