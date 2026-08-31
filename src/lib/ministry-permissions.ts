import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Recalcula o líder oficial de um ministério com base nos membros com papel
 * 'lider'/'ambos' (aba Ministérios = fonte da verdade).
 *  - leader_name = todos os nomes juntos (ex: "Cintia, Ricardo")
 *  - leader_user_id = o primeiro líder com login vinculado
 *  - se não há líder, limpa ambos
 * Também garante role 'ministry_leader' para cada líder com login.
 */
export async function recalcMinistryLeaders(
  serviceClient: SupabaseClient,
  ministryId: string
): Promise<void> {
  const { data: leaderMembers } = await serviceClient
    .from('ministry_members')
    .select('name, email, role')
    .eq('ministry_id', ministryId)
    .in('role', ['lider', 'ambos'])
    .order('name')

  if (!leaderMembers || leaderMembers.length === 0) {
    await serviceClient
      .from('ministries')
      .update({ leader_user_id: null, leader_name: null })
      .eq('id', ministryId)
    return
  }

  const allNames = leaderMembers.map(l => l.name).join(', ')
  const primary = leaderMembers.find(l => l.email) || leaderMembers[0]
  const primaryEmail = primary.email?.trim().toLowerCase() || null

  let leaderUserId: string | null = null

  // Garante role ministry_leader para todos os líderes com login
  for (const l of leaderMembers) {
    const email = l.email?.trim().toLowerCase()
    if (!email) continue
    const { data: p } = await serviceClient
      .from('profiles').select('id').ilike('email', email).maybeSingle()
    if (p) {
      await serviceClient.from('profiles').update({ role: 'ministry_leader' }).eq('id', p.id)
      if (email === primaryEmail) leaderUserId = p.id
    }
  }

  await serviceClient
    .from('ministries')
    .update({ leader_user_id: leaderUserId, leader_name: allNames })
    .eq('id', ministryId)
}

/**
 * Verifica se o usuário pode gerenciar um ministério.
 * Retorna true se:
 *  - é admin, OU
 *  - é o leader_user_id oficial do ministério, OU
 *  - é membro do ministério com papel 'lider' ou 'ambos' (múltiplos líderes)
 */
export async function canManageMinistry(
  serviceClient: SupabaseClient,
  userId: string,
  ministry: { id: string; leader_user_id: string | null }
): Promise<boolean> {
  // Admin?
  const { data: profile } = await serviceClient
    .from('profiles').select('role, email').eq('id', userId).single()

  if (profile?.role === 'admin') return true

  // Líder oficial?
  if (ministry.leader_user_id === userId) return true

  // Líder na lista de membros (múltiplos líderes)?
  if (profile?.email) {
    const { data: leaderMember } = await serviceClient
      .from('ministry_members')
      .select('id')
      .eq('ministry_id', ministry.id)
      .in('role', ['lider', 'ambos'])
      .ilike('email', profile.email)
      .maybeSingle()

    if (leaderMember) return true
  }

  return false
}
