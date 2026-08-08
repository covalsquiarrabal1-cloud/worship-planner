import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()

  const { data: ministry } = await serviceClient
    .from('ministries').select('id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const { data: members } = await serviceClient
    .from('ministry_members')
    .select('id, name, gender')
    .eq('ministry_id', ministry.id)
    .eq('is_blocked', false)
    .order('name')

  const memberIds = (members || []).map(m => m.id)
  const { data: roles } = await serviceClient
    .from('intercessao_member_roles')
    .select('member_id, role_type')
    .in('member_id', memberIds.length > 0 ? memberIds : ['none'])

  const roleMap: Record<string, string[]> = {}
  for (const r of roles || []) {
    if (!roleMap[r.member_id]) roleMap[r.member_id] = []
    roleMap[r.member_id].push(r.role_type)
  }

  return NextResponse.json((members || []).map(m => ({ ...m, roles: roleMap[m.id] || [] })))
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { data: ministry } = await serviceClient
    .from('ministries').select('id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const body = await request.json()
  const { memberRoles } = body as { memberRoles: { member_id: string; roles: string[] }[] }
  if (!Array.isArray(memberRoles)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { data: members } = await serviceClient
    .from('ministry_members').select('id').eq('ministry_id', ministry.id)
  const memberIds = (members || []).map(m => m.id)

  if (memberIds.length > 0) {
    await serviceClient.from('intercessao_member_roles').delete().in('member_id', memberIds)
  }

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
