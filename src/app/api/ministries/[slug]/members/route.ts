import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { capitalizeName } from '@/lib/utils'
import { canManageMinistry } from '@/lib/ministry-permissions'

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

  if (!(await canManageMinistry(serviceClient, user.id, ministry))) {
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
    .insert({ ministry_id: ministry.id, name: capitalizeName(name), email: normalizedEmail, role: memberRole })
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

  if (!(await canManageMinistry(serviceClient, user.id, ministry))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  // Descobre quem era este membro antes de remover
  const { data: prevMember } = await serviceClient
    .from('ministry_members')
    .select('email, role')
    .eq('id', id)
    .single()

  const { error } = await serviceClient.from('ministry_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se o membro removido era o líder oficial, reajusta o líder do ministério
  const prevEmail = prevMember?.email?.trim().toLowerCase() || null
  if (prevEmail && (prevMember?.role === 'lider' || prevMember?.role === 'ambos')) {
    const { data: prevProfile } = await serviceClient
      .from('profiles').select('id').ilike('email', prevEmail).single()

    if (prevProfile && ministry.leader_user_id === prevProfile.id) {
      const { data: otherLeaders } = await serviceClient
        .from('ministry_members')
        .select('name, email')
        .eq('ministry_id', ministry.id)
        .in('role', ['lider', 'ambos'])

      if (otherLeaders && otherLeaders.length > 0) {
        const nextLeader = otherLeaders.find(l => l.email) || otherLeaders[0]
        const nextEmail = nextLeader.email?.trim().toLowerCase() || null
        let nextUserId: string | null = null
        if (nextEmail) {
          const { data: np } = await serviceClient
            .from('profiles').select('id').ilike('email', nextEmail).single()
          nextUserId = np?.id || null
        }
        await serviceClient
          .from('ministries')
          .update({ leader_user_id: nextUserId, leader_name: nextLeader.name })
          .eq('id', ministry.id)
      } else {
        await serviceClient
          .from('ministries')
          .update({ leader_user_id: null, leader_name: null })
          .eq('id', ministry.id)
      }
    }
  }

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

  if (!(await canManageMinistry(serviceClient, user.id, ministry))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json()
  const { id, name, email, role } = body
  if (!id || !name) return NextResponse.json({ error: 'ID e nome obrigatórios' }, { status: 400 })

  const memberRole = ['membro', 'lider', 'ambos'].includes(role) ? role : 'membro'
  const normalizedEmail = email ? email.trim().toLowerCase() : null

  // Descobre quem era este membro antes da edição (para saber se era o líder)
  const { data: prevMember } = await serviceClient
    .from('ministry_members')
    .select('email, role')
    .eq('id', id)
    .single()

  const { error } = await serviceClient
    .from('ministry_members')
    .update({ name: capitalizeName(name), email: normalizedEmail, role: memberRole })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se for líder ou ambos, atualizar acesso e definir como líder do ministério
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
  } else {
    // Membro deixou de ser líder. Se ele era o líder oficial deste ministério, limpa.
    const prevEmail = prevMember?.email?.trim().toLowerCase() || null
    if (prevEmail) {
      const { data: prevProfile } = await serviceClient
        .from('profiles')
        .select('id')
        .ilike('email', prevEmail)
        .single()

      if (prevProfile && ministry.leader_user_id === prevProfile.id) {
        // Verifica se ainda existe outro líder na aba Ministérios
        const { data: otherLeaders } = await serviceClient
          .from('ministry_members')
          .select('name, email')
          .eq('ministry_id', ministry.id)
          .in('role', ['lider', 'ambos'])
          .neq('id', id)

        if (otherLeaders && otherLeaders.length > 0) {
          const nextLeader = otherLeaders.find(l => l.email) || otherLeaders[0]
          const nextEmail = nextLeader.email?.trim().toLowerCase() || null
          let nextUserId: string | null = null
          if (nextEmail) {
            const { data: np } = await serviceClient
              .from('profiles').select('id').ilike('email', nextEmail).single()
            nextUserId = np?.id || null
          }
          await serviceClient
            .from('ministries')
            .update({ leader_user_id: nextUserId, leader_name: nextLeader.name })
            .eq('id', ministry.id)
        } else {
          await serviceClient
            .from('ministries')
            .update({ leader_user_id: null, leader_name: null })
            .eq('id', ministry.id)
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}
