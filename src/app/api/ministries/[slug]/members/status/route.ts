import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()

  // Check permission
  const { data: ministry } = await serviceClient
    .from('ministries').select('id, leader_user_id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && ministry.leader_user_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id, is_blocked } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { error } = await serviceClient
    .from('ministry_members')
    .update({ is_blocked })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
