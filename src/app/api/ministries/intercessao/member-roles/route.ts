import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

// GET: Load all member roles for intercessão
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  const { data: ministry } = await serviceClient
    .from('ministries').select('id').eq('slug', 'intercessao').single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  // Get all active members with their roles
  const { data: members } = await serviceClient
    .from('ministry_members')
    .select('id, name, gender')
    .eq('ministry_id', ministry.id)
    .eq('is_blocked', false)
    .order('name')

  const { data: roles } = await serviceClient
    .from('intercessao_member_roles')
    .select('member_id, role_type')

  // Build a map: member_id -> array of role_types
  const roleMap: Record<string, string[]> = {}
  for (const r of roles || []) {
    if (!roleMap[r.member_id]) roleMap[r.member_id] = []
    roleMap[r.member_id].push(r.role_type)
  }

  const result = (members || []).map(m => ({
    ...m,
    roles: roleMap[m.id] || [],
  }))

  return NextResponse.json(result)
}

// POST: Save all member roles (replaces existing)
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { data: ministry } = await serviceClient
    .from('ministries').select('id').eq('slug', 'intercessao').single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const body = await request.json()
  const { memberRoles } = body as { memberRoles: { member_id: string; roles: string[] }[] }

  if (!Array.isArray(memberRoles)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Get all member IDs for this ministry to scope the delete
  const { data: members } = await serviceClient
    .from('ministry_members')
    .select('id')
    .eq('ministry_id', ministry.id)

  const memberIds = (members || []).map(m => m.id)

  // Delete all existing roles for these members
  if (memberIds.length > 0) {
    await serviceClient.from('intercessao_member_roles').delete().in('member_id', memberIds)
  }

  // Insert new roles
  const rows: { member_id: string; role_type: string }[] = []
  for (const mr of memberRoles) {
    for (const role of mr.roles) {
      rows.push({ member_id: mr.member_id, role_type: role })
    }
  }

  if (rows.length > 0) {
    const { error } = await serviceClient.from('intercessao_member_roles').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: rows.length })
}
