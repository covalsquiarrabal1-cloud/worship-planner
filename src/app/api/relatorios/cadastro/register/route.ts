import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

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

  // Capitalize name
  const capitalizedName = name.trim().toLowerCase().split(/\s+/)
    .map((w: string, i: number) => {
      if (i > 0 && ['de','da','do','das','dos','e','em','na','no','nas','nos'].includes(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')

  // Check if already exists in ministry_signups
  const { data: existing } = await serviceClient
    .from('ministry_signups')
    .select('id')
    .ilike('email', normalizedEmail)
    .limit(1)

  if (existing && existing.length > 0) {
    // Update existing
    await serviceClient
      .from('ministry_signups')
      .update({
        name: capitalizedName,
        phone: phone || null,
        birth_date: birth_date || null,
      })
      .ilike('email', normalizedEmail)
  } else {
    // Insert new
    const { error } = await serviceClient
      .from('ministry_signups')
      .insert({
        name: capitalizedName,
        email: normalizedEmail,
        phone: phone || null,
        birth_date: birth_date || null,
        status: 'approved',
      })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
