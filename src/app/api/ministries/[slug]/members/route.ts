import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

const INTERNAL_PASSWORD = 'adoração26'

async function ensureUserAccess(serviceClient: SupabaseClient, email: string, name: string) {
  // Check if profile already exists for this email
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .single()

  if (existingProfile) return // Already has access

  // Try to create auth user
  const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password: INTERNAL_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  })

  if (createError && createError.message.includes('already been registered')) {
    // User exists in auth but no profile - find and create profile
    const { data: { users } } = await serviceClient.auth.admin.listUsers()
    const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (existingUser) {
      await serviceClient.from('profiles').upsert({
        id: existingUser.id,
        email,
        full_name: name,
        role: 'member',
      }, { onConflict: 'id' })
    }
  } else if (newUser) {
    // New user created - create profile
    await serviceClient.from('profiles').upsert({
      id: newUser.user.id,
      email,
      full_name: name,
      role: 'member',
    }, { onConflict: 'id' })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()

  const { data: ministry } = await serviceClient
    .from('ministries').select('id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const { data, error } = await serviceClient
    .from('ministry_members')
    .select('*')
    .eq('ministry_id', ministry.id)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()

  // Check permission (admin or ministry leader)
  const { data: ministry } = await serviceClient
    .from('ministries').select('id, leader_user_id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && ministry.leader_user_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, role } = body
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const memberRole = ['membro', 'lider', 'ambos'].includes(role) ? role : 'membro'
  const normalizedEmail = email ? email.trim().toLowerCase() : null

  // Insert ministry member
  const { data, error } = await serviceClient
    .from('ministry_members')
    .insert({ ministry_id: ministry.id, name, email: normalizedEmail, role: memberRole })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-create login access if email was provided
  if (normalizedEmail) {
    await ensureUserAccess(serviceClient, normalizedEmail, name)

    // Se for líder ou ambos, atualizar role do profile para ministry_leader e setar no ministério
    if (memberRole === 'lider' || memberRole === 'ambos') {
      const { data: existingProfile } = await serviceClient
        .from('profiles')
        .select('id')
        .ilike('email', normalizedEmail)
        .single()

      if (existingProfile) {
        // Atualizar role para ministry_leader
        await serviceClient
          .from('profiles')
          .update({ role: 'ministry_leader' })
          .eq('id', existingProfile.id)

        // Setar como líder do ministério
        await serviceClient
          .from('ministries')
          .update({ leader_user_id: existingProfile.id, leader_name: name })
          .eq('id', ministry.id)
      }
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()

  const { data: ministry } = await serviceClient
    .from('ministries').select('id, leader_user_id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && ministry.leader_user_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { error } = await serviceClient.from('ministry_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()

  const { data: ministry } = await serviceClient
    .from('ministries').select('id, leader_user_id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && ministry.leader_user_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json()
  const { id, name, email, role } = body
  if (!id || !name) return NextResponse.json({ error: 'ID e nome obrigatórios' }, { status: 400 })

  const memberRole = ['membro', 'lider', 'ambos'].includes(role) ? role : 'membro'
  const normalizedEmail = email ? email.trim().toLowerCase() : null

  const { error } = await serviceClient
    .from('ministry_members')
    .update({ name: name.trim(), email: normalizedEmail, role: memberRole })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se for líder ou ambos, atualizar acesso
  if (normalizedEmail && (memberRole === 'lider' || memberRole === 'ambos')) {
    await ensureUserAccess(serviceClient, normalizedEmail, name.trim())

    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .single()

    if (existingProfile) {
      await serviceClient
        .from('profiles')
        .update({ role: 'ministry_leader' })
        .eq('id', existingProfile.id)

      await serviceClient
        .from('ministries')
        .update({ leader_user_id: existingProfile.id, leader_name: name.trim() })
        .eq('id', ministry.id)
    }
  }

  return NextResponse.json({ success: true })
}
