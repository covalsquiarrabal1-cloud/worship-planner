import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

const INTERNAL_PASSWORD = 'worship-planner-internal-2024-secret'

async function ensureUserAccess(serviceClient: SupabaseClient, email: string, name: string) {
  const normalizedEmail = email.trim().toLowerCase()

  // Check if profile already exists for this email
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('id')
    .ilike('email', normalizedEmail)
    .single()

  if (existingProfile) return // Already has access

  // Try to create auth user
  const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
    email: normalizedEmail,
    password: INTERNAL_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  })

  if (createError && createError.message.includes('already been registered')) {
    // User exists in auth but no profile - find and create profile
    const { data: { users } } = await serviceClient.auth.admin.listUsers()
    const existingUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail)
    if (existingUser) {
      await serviceClient.from('profiles').upsert({
        id: existingUser.id,
        email: normalizedEmail,
        full_name: name,
        role: 'member',
      }, { onConflict: 'id' })
    }
  } else if (newUser) {
    // New user created - create profile
    await serviceClient.from('profiles').upsert({
      id: newUser.user.id,
      email: normalizedEmail,
      full_name: name,
      role: 'member',
    }, { onConflict: 'id' })
  }
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('members')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Verify admin
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { data, error } = await serviceClient
    .from('members')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-create login access if email was provided
  if (data.email) {
    await ensureUserAccess(serviceClient, data.email, data.name || body.name || '')
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { id, ...payload } = body

  const { data, error } = await serviceClient
    .from('members')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { error } = await serviceClient
    .from('members')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
