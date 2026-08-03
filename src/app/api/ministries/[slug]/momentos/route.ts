import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: ministry } = await serviceClient.from('ministries').select('id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const { data, error } = await serviceClient
    .from('ministry_momentos')
    .select('id, event_date, culto, momento, member_id, member:ministry_members(id, name, nickname)')
    .eq('ministry_id', ministry.id)
    .eq('month', month)
    .eq('year', year)
    .order('event_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { data: ministry } = await serviceClient.from('ministries').select('id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const body = await request.json()
  const { momentos, month, year } = body

  if (!Array.isArray(momentos) || !month || !year) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Delete existing for this month
  await serviceClient.from('ministry_momentos')
    .delete()
    .eq('ministry_id', ministry.id)
    .eq('month', month)
    .eq('year', year)

  // Insert new
  if (momentos.length > 0) {
    const rows = momentos.map((m: any) => ({
      ministry_id: ministry.id,
      event_date: m.event_date,
      culto: m.culto,
      momento: m.momento || null,
      member_id: m.member_id || null,
      month,
      year,
    }))
    const { error } = await serviceClient.from('ministry_momentos').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  const body = await request.json()
  const { id, member_id } = body

  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  await serviceClient.from('ministry_momentos')
    .update({ member_id: member_id || null })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
