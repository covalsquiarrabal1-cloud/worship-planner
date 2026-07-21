import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Internal fixed password for email-only login (users never see this)
const INTERNAL_PASSWORD = 'worship-planner-internal-2024-secret'

export async function POST(request: Request) {
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

  // Check if auth user exists
  const { data: existingUsers } = await serviceClient.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === normalizedEmail
  )

  if (!existingUser) {
    // Create auth user with internal password
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email: normalizedEmail,
      password: INTERNAL_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: member?.name || '' },
    })

    if (createError) {
      return NextResponse.json({ error: 'Erro ao criar acesso: ' + createError.message }, { status: 500 })
    }

    // Create profile
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
  } else {
    // Ensure password is set to internal password (in case it was different)
    await serviceClient.auth.admin.updateUserById(existingUser.id, {
      password: INTERNAL_PASSWORD,
    })
  }

  // Now sign in using a separate supabase client (anon key, server-side)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: normalizedEmail,
    password: INTERNAL_PASSWORD,
  })

  if (signInError || !signInData.session) {
    return NextResponse.json({ error: 'Erro ao autenticar: ' + signInError?.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    session: {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    },
    name: member?.name || '',
  })
}
