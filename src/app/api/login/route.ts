import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const INTERNAL_PASSWORD = 'worship-planner-internal-2024-secret'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha obrigatórios' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 })
    }

    const serviceClient = await createServiceRoleClient()

    // Check if email exists in members or profiles
    const { data: member } = await serviceClient
      .from('members')
      .select('id, name')
      .ilike('email', normalizedEmail)
      .single()

    let memberName = member?.name || ''

    if (!member) {
      // Check ministry_members
      const { data: ministryMember } = await serviceClient
        .from('ministry_members')
        .select('id, name')
        .ilike('email', normalizedEmail)
        .limit(1)
        .single()

      if (ministryMember) {
        memberName = ministryMember.name
      } else {
        // Check profiles
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('id, full_name')
          .ilike('email', normalizedEmail)
          .single()

        if (!profile) {
          return NextResponse.json({ error: 'E-mail não cadastrado' }, { status: 404 })
        }
        memberName = profile.full_name || ''
      }
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. Try to sign in with the provided password
    const { data: signInData } = await anonClient.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (signInData?.session) {
      // Check if user still has internal password (needs to set their own)
      // We track this via user_metadata.password_set
      const hasSetPassword = signInData.user?.user_metadata?.password_set === true
      const usedInternalPassword = password === INTERNAL_PASSWORD

      return NextResponse.json({
        success: true,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        },
        name: memberName,
        mustSetPassword: usedInternalPassword && !hasSetPassword,
      })
    }

    // 2. If user's password fails, try internal password (first access flow)
    // This means the user typed a wrong password OR never logged before
    if (password !== INTERNAL_PASSWORD) {
      // Try with internal password to check if this is a first-access user
      const { data: internalData } = await anonClient.auth.signInWithPassword({
        email: normalizedEmail,
        password: INTERNAL_PASSWORD,
      })

      if (internalData?.session) {
        // User still has internal password but typed something else
        return NextResponse.json({
          error: 'Senha incorreta. Se é seu primeiro acesso, use a senha temporária fornecida pelo líder.',
        }, { status: 401 })
      }
    }

    // 3. User doesn't exist in auth yet - create
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email: normalizedEmail,
      password: INTERNAL_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: memberName, password_set: false },
    })

    if (createError && createError.message.includes('already been registered')) {
      return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
    } else if (createError) {
      return NextResponse.json({ error: 'Erro ao criar acesso: ' + createError.message }, { status: 500 })
    }

    if (newUser) {
      await serviceClient.from('profiles').upsert({
        id: newUser.user.id,
        email: normalizedEmail,
        full_name: memberName,
        role: 'member',
      }, { onConflict: 'id' })
    }

    // Sign in with internal password
    const { data: retryData } = await anonClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: INTERNAL_PASSWORD,
    })

    if (!retryData?.session) {
      return NextResponse.json({ error: 'Não foi possível autenticar.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session: {
        access_token: retryData.session.access_token,
        refresh_token: retryData.session.refresh_token,
      },
      name: memberName,
      mustSetPassword: true,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno: ' + (err?.message || 'desconhecido') }, { status: 500 })
  }
}
