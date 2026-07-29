import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha obrigatórios' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (signInError || !signInData?.session) {
      return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno: ' + (err?.message || 'desconhecido') }, { status: 500 })
  }
}
