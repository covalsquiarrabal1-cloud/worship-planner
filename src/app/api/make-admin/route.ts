import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Use service role to bypass RLS
  const serviceClient = await createServiceRoleClient()

  // Check if profile exists
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (existingProfile) {
    // Update to admin
    const { error } = await serviceClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Profile atualizado para admin',
      profile: { ...existingProfile, role: 'admin' }
    })
  } else {
    // Create profile as admin
    const { data: newProfile, error } = await serviceClient
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
        role: 'admin',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Profile criado como admin',
      profile: newProfile
    })
  }
}
