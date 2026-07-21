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
    if (!member) {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('id, role')
        .ilike('email', normalizedEmail)
        .single()

      if (!profile) {
        return NextResponse.json({ error: 'E-mail não cadastrado' }, { status: 404 })
      }
      isAdmin = profile.role === 'admin'
    }

    // Try to sign in directly first
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let signInResult = await anonClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: INTERNAL_PASSWORD,
    })

    // If sign in failed, user might not exist or has different password
    if (signInResult.error) {
      // Try to create the user
      const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
        email: normalizedEmail,
        password: INTERNAL_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: member?.name || '' },
      })

      if (createError) {
        // User exists but with different password - update password
        if (createError.message.includes('already been registered')) {
          // Get user by email and update password
          const { data: userData } = await serviceClient.auth.admin.listUsers({
            page: 1,
            perPage: 1,
          })
          
          // Find user by email in a more targeted way
          const { data: userByEmail } = await serviceClient
            .from('profiles')
            .select('id')
            .ilike('email', normalizedEmail)
            .single()

          if (userByEmail) {
            await serviceClient.auth.admin.updateUserById(userByEmail.id, {
              password: INTERNAL_PASSWORD,
            })
          }
        } else {
          return NextResponse.json({ error: 'Erro ao criar acesso: ' + createError.message }, { status: 500 })
        }
      } else if (newUser) {
        // Create profile for new user
        await serviceClient.from('profiles').upsert({
          id: newUser.user.id,
          email: normalizedEmail,
          full_name: member?.name || '',
          role: isAdmin ? 'admin' : 'member',
        }, { onConflict: 'id' })

        // Link member to user_id
        if (member) {
          await serviceClient
            .from('members')
            .update({ user_id: newUser.user.id })
            .eq('id', member.id)
        }
      }

      // Try sign in again
      signInResult = await anonClient.auth.signInWithPassword({
        email: normalizedEmail,
        password: INTERNAL_PASSWORD,
      })

      if (signInResult.error || !signInResult.data.session) {
        return NextResponse.json({ error: 'Erro ao autenticar. Tente novamente.' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      session: {
        access_token: signInResult.data.session!.access_token,
        refresh_token: signInResult.data.session!.refresh_token,
      },
      name: member?.name || '',
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno: ' + (err?.message || 'desconhecido') }, { status: 500 })
  }
}
