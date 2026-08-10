import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Buscar tudo em paralelo
  const [ministriesRes, rolesRes, assignmentsRes, ministryMembersRes, membersRes, signupsRes] = await Promise.all([
    serviceClient.from('ministries').select('id, name, slug, leader_name').order('name'),
    serviceClient.from('person_roles').select('id, name').order('name'),
    serviceClient.from('member_person_roles').select('member_email, role_id'),
    serviceClient.from('ministry_members').select('name, email, ministry_id, role'),
    serviceClient.from('members').select('name, email, is_leader, is_general_leader'),
    serviceClient.from('ministry_signups').select('name, email'),
  ])

  const roles = rolesRes.data || []
  const assignments = assignmentsRes.data || []
  const ministries = ministriesRes.data || []
  const ministryMembers = ministryMembersRes.data || []
  const members = membersRes.data || []
  const signups = signupsRes.data || []

  // Contagem de membros por ministério
  const ministryCounts: { id: string; name: string; slug: string; count: number }[] = []
  for (const m of ministries) {
    const count = ministryMembers.filter(mm => mm.ministry_id === m.id).length
    ministryCounts.push({ id: m.id, name: m.name, slug: m.slug, count })
  }
  // Add louvor
  ministryCounts.unshift({ id: 'louvor', name: 'Louvor', slug: 'louvor', count: members.length })
  ministryCounts.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  // Pessoas por função (com nomes e ministérios)
  const roleCounts: { id: string; name: string; count: number; people: { name: string; email: string; ministries: string[] }[] }[] = []

  // Build email-to-name map and email-to-ministries map
  const emailToName: Record<string, string> = {}
  const emailToMinistries: Record<string, string[]> = {}

  for (const m of members) {
    if (m.email) {
      emailToName[m.email.toLowerCase()] = m.name
      if (!emailToMinistries[m.email.toLowerCase()]) emailToMinistries[m.email.toLowerCase()] = []
      emailToMinistries[m.email.toLowerCase()].push('Louvor')
    }
  }
  for (const mm of ministryMembers) {
    if (mm.email) {
      const key = mm.email.toLowerCase()
      if (!emailToName[key]) emailToName[key] = mm.name
      if (!emailToMinistries[key]) emailToMinistries[key] = []
      const ministry = ministries.find(m => m.id === mm.ministry_id)
      if (ministry) emailToMinistries[key].push(ministry.name)
    }
  }
  for (const s of signups) {
    if (s.email) {
      const key = s.email.toLowerCase()
      if (!emailToName[key]) emailToName[key] = s.name
    }
  }

  for (const role of roles) {
    if (role.name === 'Membro') continue // Skip "Membro" card
    const roleAssignments = assignments.filter(a => a.role_id === role.id)
    const people = roleAssignments.map(a => {
      const name = emailToName[a.member_email] || a.member_email
      // For "Ministro" role, show only ministries where they are leader
      let personMinistries: string[]
      if (role.name === 'Ministro') {
        const leaderMinistries = new Set<string>()
        // Source 1: ministries.leader_name
        for (const m of ministries) {
          if (m.leader_name && m.leader_name.toLowerCase() === name.toLowerCase()) {
            leaderMinistries.add(m.name)
          }
        }
        // Source 2: ministry_members.role = 'lider' (by email)
        const leaderEntries = ministryMembers.filter(
          mm => mm.email && mm.email.toLowerCase() === a.member_email && mm.role === 'lider'
        )
        for (const entry of leaderEntries) {
          const ministry = ministries.find(m => m.id === entry.ministry_id)
          if (ministry) leaderMinistries.add(ministry.name)
        }
        // Source 3: members.is_general_leader = true means leader of "Adoração" (worship)
        const memberRecord = members.find(m => m.email && m.email.toLowerCase() === a.member_email)
        if (memberRecord?.is_general_leader) {
          leaderMinistries.add('Adoração')
        }
        personMinistries = Array.from(leaderMinistries).sort()
      } else {
        personMinistries = emailToMinistries[a.member_email] || []
      }
      return {
        name,
        email: a.member_email,
        ministries: personMinistries,
      }
    }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    roleCounts.push({ id: role.id, name: role.name, count: people.length, people })
  }

  // Total cadastrados (all unique people with details)
  const allEmails = new Set<string>()
  for (const a of assignments) allEmails.add(a.member_email)
  for (const m of members) if (m.email) allEmails.add(m.email.toLowerCase())
  for (const mm of ministryMembers) if (mm.email) allEmails.add(mm.email.toLowerCase())
  for (const s of signups) if (s.email) allEmails.add(s.email.toLowerCase())

  // Get roles for each person
  const emailToRoles: Record<string, string[]> = {}
  for (const a of assignments) {
    if (!emailToRoles[a.member_email]) emailToRoles[a.member_email] = []
    const role = roles.find(r => r.id === a.role_id)
    if (role) emailToRoles[a.member_email].push(role.name)
  }

  const allPeople = Array.from(allEmails).map(email => ({
    name: emailToName[email] || email,
    email,
    roles: emailToRoles[email] || [],
    ministries: emailToMinistries[email] || [],
  })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return NextResponse.json({
    ministryCounts,
    totalPeople: allPeople.length,
    allPeople,
    roleCounts,
  })
}
