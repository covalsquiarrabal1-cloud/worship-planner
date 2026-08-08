import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.exchangeCodeForSession(code)

    // If it's a password recovery, redirect to the create password page
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/criar-senha`)
    }
  }

  return NextResponse.redirect(origin)
}
