import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') || '/'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // If it's a password recovery, redirect to the create password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/criar-senha`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If code exchange failed, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=link_expirado`)
}
