import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Check admin
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Get all ministries
  const { data: ministries } = await serviceClient
    .from('ministries')
    .select('id, name, slug, leader_name')
    .order('name')

  // Get worship members count
  const { data: worshipMembers } = await serviceClient
    .from('members')
    .select('id, name, email')
    .order('name')

  // Get ministry members with role
  const { data: ministryMembers } = await serviceClient
    .from('ministry_members')
    .select('id, name, email, ministry_id, role')
    .eq('is_blocked', false)
    .order('name')

  // Build stats with member names and roles
  const ministryStats = (ministries || []).map(m => {
    const membersList = (ministryMembers || []).filter(mm => mm.ministry_id === m.id)
    // Determinar líder a partir dos membros cadastrados
    const leaders = membersList.filter(mm => mm.role === 'lider' || mm.role === 'ambos')
    const leaderName = leaders.length > 0 ? leaders.map(l => l.name).join(', ') : m.leader_name
    return {
      id: m.id,
      name: m.name,
      slug: m.slug,
      count: membersList.length,
      leader_name: leaderName,
      members: membersList.map(mm => mm.name),
    }
  })

  // Total unique members across all (louvor + ministries) by email
  const allEmails = new Set<string>()
  for (const m of worshipMembers || []) {
    if (m.email) allEmails.add(m.email.toLowerCase())
  }
  for (const m of ministryMembers || []) {
    if (m.email) allEmails.add(m.email.toLowerCase())
  }

  // Members serving in multiple areas (louvor counts as 1 area, each ministry is another)
  const emailAreas: Record<string, { name: string; areas: string[] }> = {}

  for (const m of worshipMembers || []) {
    if (!m.email) continue
    const key = m.email.toLowerCase()
    if (!emailAreas[key]) emailAreas[key] = { name: m.name, areas: [] }
    emailAreas[key].areas.push('Louvor')
  }

  for (const m of ministryMembers || []) {
    if (!m.email) continue
    const key = m.email.toLowerCase()
    if (!emailAreas[key]) emailAreas[key] = { name: m.name, areas: [] }
    const ministryName = (ministries || []).find(min => min.id === m.ministry_id)?.name || '?'
    emailAreas[key].areas.push(ministryName)
  }

  const multiArea = Object.values(emailAreas)
    .filter(e => e.areas.length > 1)
    .sort((a, b) => b.areas.length - a.areas.length)

  return NextResponse.json({
    worshipCount: (worshipMembers || []).length,
    worshipMembers: (worshipMembers || []).map(m => m.name),
    ministryStats,
    totalUnique: allEmails.size,
    multiArea,
  })
}
