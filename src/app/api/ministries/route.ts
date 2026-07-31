import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('ministries')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with leader email from profiles
  const leaderIds = (data || []).map((m: any) => m.leader_user_id).filter(Boolean)
  let leaderEmails: Record<string, string> = {}
  if (leaderIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, email')
      .in('id', leaderIds)
    if (profiles) {
      leaderEmails = Object.fromEntries(profiles.map(p => [p.id, p.email]))
    }
  }

  const enriched = (data || []).map((m: any) => ({
    ...m,
    leader_email: m.leader_user_id ? (leaderEmails[m.leader_user_id] || null) : null,
  }))

  return NextResponse.json(enriched)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { name, slug, leader_name } = body

  if (!name || !slug) return NextResponse.json({ error: 'Nome e slug obrigatórios' }, { status: 400 })

  const { data, error } = await serviceClient
    .from('ministries')
    .insert({ name, slug, leader_name })
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
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { error } = await serviceClient
    .from('ministries')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
