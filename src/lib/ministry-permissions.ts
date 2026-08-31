import { SupabaseClient } from '@supabase/supabase-js'

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
