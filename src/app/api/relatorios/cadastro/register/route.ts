import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

function capitalizeName(name: string): string {
  return name.trim().toLowerCase().split(/\s+/)
    .map((w: string, i: number) => {
      if (i > 0 && ['de','da','do','das','dos','e','em','na','no','nas','nos'].includes(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { name, email, phone, birth_date } = body

  if (!name || !email) return NextResponse.json({ error: 'Nome e email obrigatórios' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()
  const capitalizedName = capitalizeName(name)

  // Check if already exists in ministry_signups
  const { data: existing } = await serviceClient
    .from('ministry_signups')
    .select('id')
    .ilike('email', normalizedEmail)
    .limit(1)

  if (existing && existing.length > 0) {
    await serviceClient
      .from('ministry_signups')
      .update({ name: capitalizedName, phone: phone || null, birth_date: birth_date || null })
      .ilike('email', normalizedEmail)
  } else {
    const { error } = await serviceClient
      .from('ministry_signups')
      .insert({ name: capitalizedName, email: normalizedEmail, phone: phone || null, birth_date: birth_date || null, status: 'approved' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { old_email, new_name, new_email, phone, birth_date } = body

  if (!old_email || !new_name) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  const capitalizedName = capitalizeName(new_name)
  const normalizedNewEmail = new_email ? new_email.trim().toLowerCase() : old_email.toLowerCase()

  // Update ministry_members
  await serviceClient
    .from('ministry_members')
    .update({ name: capitalizedName, email: normalizedNewEmail })
    .ilike('email', old_email)

  // Update ministry_signups
  const { data: existingSignup } = await serviceClient
    .from('ministry_signups')
    .select('id')
    .ilike('email', old_email)
    .limit(1)

  if (existingSignup && existingSignup.length > 0) {
    await serviceClient
      .from('ministry_signups')
      .update({ name: capitalizedName, email: normalizedNewEmail, phone: phone || null, birth_date: birth_date || null })
      .ilike('email', old_email)
  } else {
    await serviceClient
      .from('ministry_signups')
      .insert({ name: capitalizedName, email: normalizedNewEmail, phone: phone || null, birth_date: birth_date || null, status: 'approved' })
  }

  // Update members (louvor)
  await serviceClient
    .from('members')
    .update({ name: capitalizedName, email: normalizedNewEmail })
    .ilike('email', old_email)

  // Update profiles
  await serviceClient
    .from('profiles')
    .update({ full_name: capitalizedName, email: normalizedNewEmail })
    .ilike('email', old_email)

  // Update member_person_roles email
  if (old_email.toLowerCase() !== normalizedNewEmail) {
    await serviceClient
      .from('member_person_roles')
      .update({ member_email: normalizedNewEmail })
      .eq('member_email', old_email.toLowerCase())
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })

  const normalizedEmail = email.toLowerCase()

  // Remove from member_person_roles
  await serviceClient.from('member_person_roles').delete().eq('member_email', normalizedEmail)

  // Remove from ministry_members
  await serviceClient.from('ministry_members').delete().ilike('email', normalizedEmail)

  // Remove from ministry_signups
  await serviceClient.from('ministry_signups').delete().ilike('email', normalizedEmail)

  // Remove from members
  await serviceClient.from('members').delete().ilike('email', normalizedEmail)

  return NextResponse.json({ success: true })
}
