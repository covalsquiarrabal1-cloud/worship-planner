import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { capitalizeName } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, phone, birth_date, ministries, other_ministry, other_role } = body

    // Validações
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !birth_date) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
    }

    if ((!ministries || !Array.isArray(ministries) || ministries.length === 0) && !other_ministry?.trim()) {
      return NextResponse.json({ error: 'Selecione pelo menos um ministério ou descreva no campo abaixo.' }, { status: 400 })
    }

    // Validar que cada ministério tem role
    if (ministries && Array.isArray(ministries)) {
      for (const m of ministries) {
        if (!m.ministry_id || !m.role || !['membro', 'lider', 'ambos'].includes(m.role)) {
          return NextResponse.json({ error: 'Selecione a função para cada ministério.' }, { status: 400 })
        }
      }
    }

    const serviceClient = await createServiceRoleClient()

    // Inserir inscrição
    const { data: signup, error: signupError } = await serviceClient
      .from('ministry_signups')
      .insert({
        name: capitalizeName(name),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        birth_date,
        other_ministry: other_ministry?.trim() || null,
        other_role: other_role?.trim() || null,
      })
      .select()
      .single()

    if (signupError) {
      return NextResponse.json({ error: signupError.message }, { status: 500 })
    }

    // Inserir seleções de ministérios (se "ambos", cria duas linhas)
    if (ministries && Array.isArray(ministries) && ministries.length > 0) {
      const selections: { signup_id: string; ministry_id: string; role: string }[] = []
      for (const m of ministries as { ministry_id: string; role: string }[]) {
        if (m.role === 'ambos') {
          selections.push({ signup_id: signup.id, ministry_id: m.ministry_id, role: 'membro' })
          selections.push({ signup_id: signup.id, ministry_id: m.ministry_id, role: 'lider' })
        } else {
          selections.push({ signup_id: signup.id, ministry_id: m.ministry_id, role: m.role })
        }
      }

      const { error: selectionsError } = await serviceClient
        .from('ministry_signup_selections')
        .insert(selections)

      if (selectionsError) {
        return NextResponse.json({ error: selectionsError.message }, { status: 500 })
      }
    }

    // Ensure user has auth + profile so they can login immediately
    const INTERNAL_PASSWORD = 'adoração26'
    const normalizedEmail = email.trim().toLowerCase()
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
        user_metadata: { full_name: capitalizeName(name), password_set: false },
      })

      if (newUser?.user) {
        await serviceClient.from('profiles').upsert({
          id: newUser.user.id,
          email: normalizedEmail,
          full_name: capitalizeName(name),
          role: 'member',
        }, { onConflict: 'id' })
      } else if (createError?.message?.includes('already been registered')) {
        const { data: { users } } = await serviceClient.auth.admin.listUsers()
        const existingUser = users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail)
        if (existingUser) {
          await serviceClient.from('profiles').upsert({
            id: existingUser.id,
            email: normalizedEmail,
            full_name: capitalizeName(name),
            role: 'member',
          }, { onConflict: 'id' })
        }
      }
    }

    return NextResponse.json({ success: true, id: signup.id })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
