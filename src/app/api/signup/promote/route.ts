import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

const INTERNAL_PASSWORD = 'adoração26'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { signup_email, signup_name, ministry_id, role } = body

  if (!signup_email || !signup_name || !ministry_id || !role) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const normalizedEmail = signup_email.trim().toLowerCase()
  const memberRole = ['membro', 'lider', 'ambos'].includes(role) ? role : 'membro'

  // 1. Inserir como membro no ministério (se não existir)
  const { data: existing } = await serviceClient
    .from('ministry_members')
    .select('id')
    .eq('ministry_id', ministry_id)
    .ilike('email', normalizedEmail)
    .limit(1)
    .single()

  if (!existing) {
    await serviceClient
      .from('ministry_members')
      .insert({ ministry_id, name: signup_name.trim(), email: normalizedEmail, role: memberRole })
  }

  // 2. Criar acesso (login) para a pessoa
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('id')
    .ilike('email', normalizedEmail)
    .single()

  if (!existingProfile) {
    // Criar user no auth
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email: normalizedEmail,
      password: INTERNAL_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: signup_name.trim() },
    })

    if (newUser && !createError) {
      await serviceClient.from('profiles').upsert({
        id: newUser.user.id,
        email: normalizedEmail,
        full_name: signup_name.trim(),
        role: memberRole === 'lider' || memberRole === 'ambos' ? 'ministry_leader' : 'member',
      }, { onConflict: 'id' })
    }
  } else if (memberRole === 'lider' || memberRole === 'ambos') {
    // Atualizar para ministry_leader se for líder
    await serviceClient
      .from('profiles')
      .update({ role: 'ministry_leader' })
      .eq('id', existingProfile.id)

    // Setar como líder do ministério
    await serviceClient
      .from('ministries')
      .update({ leader_user_id: existingProfile.id, leader_name: signup_name.trim() })
      .eq('id', ministry_id)
  }

  // 3. Marcar como "inserido" na tabela de seleções
  const { data: signups } = await serviceClient
    .from('ministry_signups')
    .select('id')
    .ilike('email', normalizedEmail)

  if (signups && signups.length > 0) {
    const signupIds = signups.map(s => s.id)
    await serviceClient
      .from('ministry_signup_selections')
      .update({ status: 'inserido' })
      .in('signup_id', signupIds)
      .eq('ministry_id', ministry_id)
  }

  return NextResponse.json({ success: true })
}
