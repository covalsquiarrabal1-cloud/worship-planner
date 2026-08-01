import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function PUT(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { signup_email, ministry_id, old_role, new_role } = body

  if (!signup_email || !ministry_id || !new_role) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Encontrar TODOS os signups desse email
  const { data: signups } = await serviceClient
    .from('ministry_signups')
    .select('id')
    .ilike('email', signup_email)

  if (!signups || signups.length === 0) {
    return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
  }

  const signupIds = signups.map(s => s.id)

  // Atualizar o role na seleção (match por signup_ids + ministry_id + old_role)
  const { error, count } = await serviceClient
    .from('ministry_signup_selections')
    .update({ role: new_role })
    .in('signup_id', signupIds)
    .eq('ministry_id', ministry_id)
    .eq('role', old_role)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se não atualizou nenhuma linha, tenta sem o filtro old_role (caso já tenha sido alterado)
  if (count === 0) {
    await serviceClient
      .from('ministry_signup_selections')
      .update({ role: new_role })
      .in('signup_id', signupIds)
      .eq('ministry_id', ministry_id)
  }

  return NextResponse.json({ success: true })
}
