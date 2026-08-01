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

  // Buscar todas as seleções pendentes
  const { data: pendingSelections } = await serviceClient
    .from('ministry_signup_selections')
    .select(`
      id,
      role,
      ministry_id,
      signup:ministry_signups(id, name, email)
    `)
    .eq('status', 'pendente')

  if (!pendingSelections || pendingSelections.length === 0) {
    return NextResponse.json({ message: 'Nenhuma inscrição pendente.', inserted: 0 })
  }

  let inserted = 0
  let errors = 0

  for (const sel of pendingSelections) {
    const signup = sel.signup as any
    if (!signup || !signup.email) continue

    const normalizedEmail = signup.email.trim().toLowerCase()
    const memberRole = sel.role || 'membro'

    try {
      // 1. Verificar se já existe no ministério
      const { data: existing } = await serviceClient
        .from('ministry_members')
        .select('id')
        .eq('ministry_id', sel.ministry_id)
        .ilike('email', normalizedEmail)
        .limit(1)
        .single()

      // 2. Inserir como membro se não existir
      if (!existing) {
        await serviceClient
          .from('ministry_members')
          .insert({
            ministry_id: sel.ministry_id,
            name: signup.name.trim(),
            email: normalizedEmail,
            role: memberRole,
          })
      }

      // 3. Criar acesso (login)
      const { data: existingProfile } = await serviceClient
        .from('profiles')
        .select('id')
        .ilike('email', normalizedEmail)
        .single()

      if (!existingProfile) {
        const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
          email: normalizedEmail,
          password: INTERNAL_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: signup.name.trim() },
        })

        if (newUser && !createError) {
          await serviceClient.from('profiles').upsert({
            id: newUser.user.id,
            email: normalizedEmail,
            full_name: signup.name.trim(),
            role: memberRole === 'lider' ? 'ministry_leader' : 'member',
          }, { onConflict: 'id' })
        }
      } else if (memberRole === 'lider') {
        await serviceClient
          .from('profiles')
          .update({ role: 'ministry_leader' })
          .eq('id', existingProfile.id)

        await serviceClient
          .from('ministries')
          .update({ leader_user_id: existingProfile.id, leader_name: signup.name.trim() })
          .eq('id', sel.ministry_id)
      }

      // 4. Marcar como inserido
      await serviceClient
        .from('ministry_signup_selections')
        .update({ status: 'inserido' })
        .eq('id', sel.id)

      inserted++
    } catch {
      errors++
    }
  }

  return NextResponse.json({ success: true, inserted, errors, total: pendingSelections.length })
}
