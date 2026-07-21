import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Internal fixed password for email-only login (users never see this)
const INTERNAL_PASSWORD = 'worship-planner-internal-2024-secret'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const serviceClient = await createServiceRoleClient()

    // Check if email exists in members table or profiles table
    const { data: member } = await serviceClient
      .from('members')
      .select('id, name')
      .ilike('email', normalizedEmail)
      .single()

    let isAdmin = false
    let memberName = member?.name || ''

    if (!member) {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('id, role, full_name')
        .ilike('email', normalizedEmail)
        .single()

      if (!profile) {
        return NextResponse.json({ error: 'E-mail não cadastrado' }, { status: 404 })
      }
      isAdmin = profile.role === 'admin'
      memberName = profile.full_name || ''
    }

    // Try to sign in directly (fastest path)
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: INTERNAL_PASSWORD,
    })

    if (signInData?.session) {
      // Login successful
      return NextResponse.json({
        success: true,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        },
        name: memberName,
      })
    }

    // Sign in failed - need to create or update user
    // Try to create user
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email: normalizedEmail,
      password: INTERNAL_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: memberName },
    })

    if (createError && createError.message.includes('already been registered')) {
      // User exists but with different password - find and update
      const { data: profileData } = await serviceClient
        .from('profiles')
        .select('id')
        .ilike('email', normalizedEmail)
        .single()

      if (profileData) {
        await serviceClient.auth.admin.updateUserById(profileData.id, {
          password: INTERNAL_PASSWORD,
        })
      }
    } else if (createError) {
      return NextResponse.json({ error: 'Erro ao criar acesso: ' + createError.message }, { status: 500 })
    } else if (newUser) {
      // New user created - create profile and link
      await serviceClient.from('profiles').upsert({
        id: newUser.user.id,
        email: normalizedEmail,
        full_name: memberName,
        role: isAdmin ? 'admin' : 'member',
      }, { onConflict: 'id' })

      if (member) {
        await serviceClient
          .from('members')
          .update({ user_id: newUser.user.id })
          .eq('id', member.id)
      }
    }

    // Try sign in again
    const { data: retryData, error: retryError } = await anonClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: INTERNAL_PASSWORD,
    })

    if (retryError || !retryData?.session) {
      return NextResponse.json({ error: 'Não foi possível autenticar. Tente novamente.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session: {
        access_token: retryData.session.access_token,
        refresh_token: retryData.session.refresh_token,
      },
      name: memberName,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno: ' + (err?.message || 'desconhecido') }, { status: 500 })
  }
}
