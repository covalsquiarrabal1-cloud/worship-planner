import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Sincroniza os líderes dos ministérios usando a aba Ministérios (ministry_members)
 * como fonte da verdade. Para cada ministério:
 *  - Se existe um membro com role 'lider' ou 'ambos' (com email/login), define-o como
 *    leader_user_id / leader_name no ministério.
 *  - Se NÃO existe nenhum membro líder, limpa o líder do ministério.
 */
export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Only admin
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { data: ministries } = await serviceClient
    .from('ministries')
    .select('id, name, slug, leader_user_id, leader_name')

  if (!ministries) return NextResponse.json({ error: 'Nenhum ministério' }, { status: 404 })

  const changes: { ministry: string; action: string; leader: string | null }[] = []

  for (const ministry of ministries) {
    // Busca membros líderes deste ministério
    const { data: leaderMembers } = await serviceClient
      .from('ministry_members')
      .select('name, email, role')
      .eq('ministry_id', ministry.id)
      .in('role', ['lider', 'ambos'])
      .order('name')

    if (leaderMembers && leaderMembers.length > 0) {
      // Usa o primeiro líder com email como líder oficial
      const leader = leaderMembers.find(l => l.email) || leaderMembers[0]
      const normalizedEmail = leader.email?.trim().toLowerCase() || null

      let leaderUserId: string | null = null
      if (normalizedEmail) {
        const { data: leaderProfile } = await serviceClient
          .from('profiles')
          .select('id')
          .ilike('email', normalizedEmail)
          .single()
        if (leaderProfile) {
          leaderUserId = leaderProfile.id
          // Garante role de ministry_leader
          await serviceClient
            .from('profiles')
            .update({ role: 'ministry_leader' })
            .eq('id', leaderProfile.id)
        }
      }

      // Atualiza somente se mudou
      if (ministry.leader_user_id !== leaderUserId || ministry.leader_name !== leader.name) {
        await serviceClient
          .from('ministries')
          .update({ leader_user_id: leaderUserId, leader_name: leader.name })
          .eq('id', ministry.id)
        changes.push({ ministry: ministry.name, action: 'definido', leader: leader.name })
      }
    } else {
      // Nenhum líder na aba Ministérios -> limpa o líder do ministério
      if (ministry.leader_user_id || ministry.leader_name) {
        await serviceClient
          .from('ministries')
          .update({ leader_user_id: null, leader_name: null })
          .eq('id', ministry.id)
        changes.push({ ministry: ministry.name, action: 'removido', leader: null })
      }
    }
  }

  return NextResponse.json({ success: true, changes, total: changes.length })
}
