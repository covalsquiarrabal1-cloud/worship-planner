import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Retorna os momentos (Sobrenatural, Dízimos e Ofertas) em que o usuário logado
 * está escalado, apenas de escalas PUBLICADAS. Usado na escala pessoal do membro.
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  // Email e nome do usuário
  const { data: profile } = await serviceClient
    .from('profiles').select('email, full_name').eq('id', user.id).single()
  const email = profile?.email?.toLowerCase() || user.email?.toLowerCase() || null
  if (!email) return NextResponse.json([])

  // momentos_members deste usuário (por email)
  const { data: myMomentosMembers } = await serviceClient
    .from('momentos_members')
    .select('id, ministry_id, name, nickname')
    .ilike('email', email)

  if (!myMomentosMembers || myMomentosMembers.length === 0) return NextResponse.json([])

  const memberIds = myMomentosMembers.map(m => m.id)
  const ministryIds = [...new Set(myMomentosMembers.map(m => m.ministry_id))]

  // Status de publicação fica em app_settings: momentos_published_{ministryId}_{month}_{year}
  const publishKeys = ministryIds.map(id => `momentos_published_${id}_${month}_${year}`)
  const { data: publishSettings } = await serviceClient
    .from('app_settings')
    .select('key, value')
    .in('key', publishKeys)

  const publishedMinistryIds = new Set<string>()
  for (const s of publishSettings || []) {
    if (s.value === 'true') {
      // extrai o ministryId da key: momentos_published_{id}_{month}_{year}
      const match = s.key.match(/^momentos_published_(.+)_\d+_\d+$/)
      if (match) publishedMinistryIds.add(match[1])
    }
  }

  // Busca momentos onde o usuário está escalado
  const { data: momentos } = await serviceClient
    .from('ministry_momentos')
    .select('id, ministry_id, event_date, culto, momento, member_id')
    .eq('month', month)
    .eq('year', year)
    .in('member_id', memberIds)
    .order('event_date')

  // Nomes dos ministérios
  const { data: ministries } = await serviceClient
    .from('ministries')
    .select('id, name, slug')
    .in('id', ministryIds)
  const ministryMap = Object.fromEntries((ministries || []).map(m => [m.id, m]))

  const result = (momentos || [])
    .filter(m => publishedMinistryIds.has(m.ministry_id))
    .map(m => ({
      id: m.id,
      event_date: m.event_date,
      culto: m.culto,
      momento: m.momento,
      ministry_name: ministryMap[m.ministry_id]?.name || 'Momentos',
      ministry_slug: ministryMap[m.ministry_id]?.slug || null,
    }))

  return NextResponse.json(result)
}
