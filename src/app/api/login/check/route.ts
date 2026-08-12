import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const INTERNAL_PASSWORD = 'adoração26'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const serviceClient = await createServiceRoleClient()

    // Check if email exists in members, ministry_members, ministry_signups or profiles
    const { data: member } = await serviceClient
      .from('members')
      .select('id, name')
      .ilike('email', normalizedEmail)
      .single()

    let memberName = member?.name || ''

    if (!member) {
      const { data: ministryMember } = await serviceClient
        .from('ministry_members')
        .select('id, name')
        .ilike('email', normalizedEmail)
        .limit(1)
        .single()

      if (ministryMember) {
        memberName = ministryMember.name
      } else {
        const { data: signup } = await serviceClient
          .from('ministry_signups')
          .select('id, name, nickname')
          .ilike('email', normalizedEmail)
          .single()

        if (signup) {
          memberName = signup.name
        } else {
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
    }

    // Check if user exists in auth and has set their own password
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Try to sign in with internal password
    const { data: internalLogin } = await anonClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: INTERNAL_PASSWORD,
    })

    if (internalLogin?.session) {
      // User still has internal password — first access
      const hasSetPassword = internalLogin.user?.user_metadata?.password_set === true

      if (hasSetPassword) {
        // User somehow has password_set but still uses internal — treat as has password
        // Sign out this session
        await anonClient.auth.signOut()
        return NextResponse.json({ hasPassword: true })
      }

      // First access — return session so frontend can redirect to create password
      return NextResponse.json({
        hasPassword: false,
        session: {
          access_token: internalLogin.session.access_token,
          refresh_token: internalLogin.session.refresh_token,
        },
        name: memberName,
      })
    }

    // Internal password didn't work — user already has their own password
    // Or user doesn't exist yet in auth
    const { data: { users } } = await serviceClient.auth.admin.listUsers()
    const existingUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (!existingUser) {
      // Create auth user with internal password (new user)
      const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
        email: normalizedEmail,
        password: INTERNAL_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: memberName, password_set: false },
      })

      if (createErr) {
        return NextResponse.json({ error: 'Erro ao preparar acesso.' }, { status: 500 })
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
      const { data: newLogin } = await anonClient.auth.signInWithPassword({
        email: normalizedEmail,
        password: INTERNAL_PASSWORD,
      })

      if (newLogin?.session) {
        return NextResponse.json({
          hasPassword: false,
          session: {
            access_token: newLogin.session.access_token,
            refresh_token: newLogin.session.refresh_token,
          },
          name: memberName,
        })
      }
    }

    // User exists and has their own password
    return NextResponse.json({ hasPassword: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno: ' + (err?.message || 'desconhecido') }, { status: 500 })
  }
}
