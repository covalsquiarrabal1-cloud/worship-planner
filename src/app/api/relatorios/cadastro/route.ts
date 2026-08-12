import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Check admin or staff role
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  
  let hasAccess = profile?.role === 'admin'
  
  if (!hasAccess) {
    const { data: personRoles } = await serviceClient
      .from('member_person_roles')
      .select('role_id, person_roles(name)')
      .eq('member_email', user.email?.toLowerCase() || '')
    
    const userRoles = (personRoles || []).map((pr: any) => pr.person_roles?.name).filter(Boolean)
    const staffRoles = ['Pastor', 'Ministro', 'Secretaria']
    hasAccess = userRoles.some((r: string) => staffRoles.includes(r))
  }

  if (!hasAccess) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Buscar todos os membros de ministérios
  const { data: ministryMembers } = await serviceClient
    .from('ministry_members')
    .select('id, name, email, role, ministry_id, nickname')
    .order('name')

  // Buscar ministérios
  const { data: ministries } = await serviceClient
    .from('ministries')
    .select('id, name')

  // Buscar membros do louvor
  const { data: worshipMembers } = await serviceClient
    .from('members')
    .select('id, name, email, is_leader, is_general_leader')

  // Buscar dados do formulário (telefone, data nascimento, apelido)
  const { data: signups } = await serviceClient
    .from('ministry_signups')
    .select('name, email, phone, birth_date, nickname')

  const ministryMap: Record<string, string> = {}
  for (const m of ministries || []) ministryMap[m.id] = m.name

  // Agrupar por email (pessoa única)
  const peopleMap: Record<string, {
    name: string
    email: string
    nickname: string | null
    phone: string | null
    birth_date: string | null
    ministries: { ministry_id: string; ministry_name: string; role: string; member_id: string }[]
  }> = {}

  // Adicionar membros do louvor primeiro
  for (const wm of worshipMembers || []) {
    if (!wm.email) continue
    const key = wm.email.toLowerCase()
    if (!peopleMap[key]) {
      const signup = (signups || []).find(s => s.email?.toLowerCase() === key)
      peopleMap[key] = {
        name: wm.name,
        email: wm.email,
        nickname: signup?.nickname || null,
        phone: signup?.phone || null,
        birth_date: signup?.birth_date || null,
        ministries: [],
      }
    }
    const role = wm.is_general_leader ? 'lider' : 'membro'
    peopleMap[key].ministries.push({
      ministry_id: 'louvor',
      ministry_name: 'Louvor',
      role,
      member_id: wm.id,
    })
  }

  // Adicionar membros dos ministérios
  for (const mm of ministryMembers || []) {
    if (!mm.email) continue
    const key = mm.email.toLowerCase()
    if (!peopleMap[key]) {
      const signup = (signups || []).find(s => s.email?.toLowerCase() === key)
      peopleMap[key] = {
        name: mm.name,
        email: mm.email,
        nickname: signup?.nickname || (mm as any).nickname || null,
        phone: signup?.phone || null,
        birth_date: signup?.birth_date || null,
        ministries: [],
      }
    } else if (!peopleMap[key].nickname && (mm as any).nickname) {
      // Fill nickname from ministry_members if signup didn't have it
      peopleMap[key].nickname = (mm as any).nickname
    }
    peopleMap[key].ministries.push({
      ministry_id: mm.ministry_id,
      ministry_name: ministryMap[mm.ministry_id] || '?',
      role: mm.role,
      member_id: mm.id,
    })
  }

  // Adicionar pessoas do ministry_signups que não estão em nenhum ministério
  for (const signup of signups || []) {
    if (!signup.email) continue
    const key = signup.email.toLowerCase()
    if (!peopleMap[key]) {
      peopleMap[key] = {
        name: signup.name,
        email: signup.email,
        nickname: signup.nickname || null,
        phone: signup.phone || null,
        birth_date: signup.birth_date || null,
        ministries: [],
      }
    }
  }

  // Buscar funções (person_roles) de cada pessoa
  const { data: personRolesData } = await serviceClient
    .from('member_person_roles')
    .select('member_email, role_id')

  const { data: allRoles } = await serviceClient
    .from('person_roles')
    .select('id, name')

  const roleMap: Record<string, string> = {}
  for (const r of allRoles || []) roleMap[r.id] = r.name

  const emailRoles: Record<string, string[]> = {}
  for (const pr of personRolesData || []) {
    if (!emailRoles[pr.member_email]) emailRoles[pr.member_email] = []
    const roleName = roleMap[pr.role_id]
    if (roleName) emailRoles[pr.member_email].push(roleName)
  }

  // Adicionar funções ao resultado
  const peopleWithRoles = Object.values(peopleMap).map(p => ({
    ...p,
    person_roles: emailRoles[p.email.toLowerCase()] || [],
  }))

  // Ordenar alfabeticamente
  const people = peopleWithRoles.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return NextResponse.json(people)
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
  const { old_email, new_name, new_email, phone, birth_date, nickname, role_ids, ministry_ids } = body

  if (!old_email || !new_name) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  const capitalizedName = new_name.trim().toLowerCase().split(/\s+/)
    .map((w: string, i: number) => i > 0 && ['de','da','do','das','dos','e','em','na','no','nas','nos'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  const normalizedNewEmail = new_email ? new_email.trim().toLowerCase() : old_email.toLowerCase()

  // Atualizar em ministry_members (todos os registros com esse email)
  await serviceClient
    .from('ministry_members')
    .update({ name: capitalizedName, email: normalizedNewEmail })
    .ilike('email', old_email)

  // Atualizar em ministry_signups (name, email, phone, birth_date, nickname)
  const signupUpdate: Record<string, any> = { name: capitalizedName, email: normalizedNewEmail }
  if (phone !== undefined) signupUpdate.phone = phone
  if (birth_date !== undefined) signupUpdate.birth_date = birth_date
  if (nickname !== undefined) signupUpdate.nickname = nickname

  await serviceClient
    .from('ministry_signups')
    .update(signupUpdate)
    .ilike('email', old_email)

  // If no signup record exists, create one
  const { data: existingSignup } = await serviceClient
    .from('ministry_signups')
    .select('id')
    .ilike('email', old_email)
    .limit(1)
    .single()

  if (!existingSignup) {
    await serviceClient.from('ministry_signups').insert({
      name: capitalizedName,
      email: normalizedNewEmail,
      phone: phone || null,
      birth_date: birth_date || null,
      nickname: nickname || null,
    })
  }

  // Atualizar em members (louvor)
  const membersUpdate: Record<string, any> = { name: capitalizedName, email: normalizedNewEmail }
  if (nickname !== undefined) membersUpdate.nickname = nickname
  await serviceClient
    .from('members')
    .update(membersUpdate)
    .ilike('email', old_email)

  // Atualizar em profiles
  await serviceClient
    .from('profiles')
    .update({ full_name: capitalizedName, email: normalizedNewEmail })
    .ilike('email', old_email)

  // Update person roles if provided
  if (role_ids && Array.isArray(role_ids)) {
    await serviceClient
      .from('member_person_roles')
      .delete()
      .eq('member_email', old_email.toLowerCase())

    if (role_ids.length > 0) {
      const roleRows = role_ids.map((role_id: string) => ({
        member_email: normalizedNewEmail,
        role_id,
      }))
      await serviceClient.from('member_person_roles').insert(roleRows)
    }
  }

  // Update ministry memberships if provided
  if (ministry_ids && Array.isArray(ministry_ids)) {
    // Get current ministries for this person
    const { data: currentMemberships } = await serviceClient
      .from('ministry_members')
      .select('id, ministry_id')
      .ilike('email', old_email)

    const currentMinistryIds = (currentMemberships || []).map(m => m.ministry_id)
    const targetMinistryIds = ministry_ids as string[]

    // Add new ones
    for (const mid of targetMinistryIds) {
      if (!currentMinistryIds.includes(mid)) {
        await serviceClient.from('ministry_members').insert({
          ministry_id: mid,
          name: capitalizedName,
          email: normalizedNewEmail,
          is_blocked: false,
        })
      }
    }

    // Remove old ones
    for (const membership of currentMemberships || []) {
      if (!targetMinistryIds.includes(membership.ministry_id)) {
        await serviceClient.from('ministry_members').delete().eq('id', membership.id)
      }
    }
  }

  return NextResponse.json({ success: true })
}
