import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()

  const { data: ministry } = await serviceClient
    .from('ministries').select('id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const body = await request.json()
  const { momentos } = body as { momentos: { event_date: string; culto: string; momento: string; member_id: string | null }[] }

  if (!Array.isArray(momentos) || momentos.length === 0) {
    return NextResponse.json({ error: 'Nenhum momento para adicionar' }, { status: 400 })
  }

  const rows = momentos.map(m => ({
    ministry_id: ministry.id,
    event_date: m.event_date,
    culto: m.culto,
    momento: m.momento,
    member_id: m.member_id,
    month: parseInt(m.event_date.slice(5, 7)),
    year: parseInt(m.event_date.slice(0, 4)),
  }))

  const { error } = await serviceClient.from('ministry_momentos').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
