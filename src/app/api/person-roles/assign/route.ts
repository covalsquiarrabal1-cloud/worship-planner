import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

// GET - buscar funções de uma pessoa por email
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })

  const serviceClient = await createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('member_person_roles')
    .select('role_id, person_roles(id, name)')
    .eq('member_email', email.toLowerCase())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST - atribuir função a uma pessoa
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { email, role_ids } = body

  if (!email || !Array.isArray(role_ids)) {
    return NextResponse.json({ error: 'Email e role_ids obrigatórios' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  // Remove all existing roles for this person
  await serviceClient
    .from('member_person_roles')
    .delete()
    .eq('member_email', normalizedEmail)

  // Insert new roles
  if (role_ids.length > 0) {
    const rows = role_ids.map((role_id: string) => ({
      member_email: normalizedEmail,
      role_id,
    }))

    const { error } = await serviceClient
      .from('member_person_roles')
      .insert(rows)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
