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
    .select('id, name, slug')
    .order('name')

  // Get worship members count
  const { data: worshipMembers } = await serviceClient
    .from('members')
    .select('id, name, email')

  // Get ministry members
  const { data: ministryMembers } = await serviceClient
    .from('ministry_members')
    .select('id, name, email, ministry_id')

  // Build stats
  const ministryStats = (ministries || []).map(m => {
    const count = (ministryMembers || []).filter(mm => mm.ministry_id === m.id).length
    return { id: m.id, name: m.name, slug: m.slug, count }
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
    ministryStats,
    totalUnique: allEmails.size,
    multiArea,
  })
}
