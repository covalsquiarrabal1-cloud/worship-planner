import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Verificar admin
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Total de inscrições
  const { count: totalSignups } = await serviceClient
    .from('ministry_signups')
    .select('*', { count: 'exact', head: true })

  // Última inscrição
  const { data: lastSignup } = await serviceClient
    .from('ministry_signups')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Todas as seleções com dados do ministério e da pessoa
  const { data: selections } = await serviceClient
    .from('ministry_signup_selections')
    .select(`
      role,
      status,
      ministry:ministries(id, name, slug),
      signup:ministry_signups(id, name, email)
    `)
    .order('role')

  // Agrupar por ministério
  const ministryMap: Record<string, {
    id: string
    name: string
    slug: string
    total: number
    members: { name: string; email: string; role: string; status: string }[]
  }> = {}

  if (selections) {
    for (const sel of selections) {
      const ministry = sel.ministry as any
      const signup = sel.signup as any
      if (!ministry || !signup) continue

      if (!ministryMap[ministry.id]) {
        ministryMap[ministry.id] = {
          id: ministry.id,
          name: ministry.name,
          slug: ministry.slug,
          total: 0,
          members: [],
        }
      }

      // Contar pessoas únicas (não duplicar se tem membro+líder)
      const alreadyExists = ministryMap[ministry.id].members.find(
        m => m.email === signup.email && m.role === sel.role
      )
      if (!alreadyExists) {
        ministryMap[ministry.id].members.push({
          name: signup.name,
          email: signup.email,
          role: sel.role,
          status: (sel as any).status || 'pendente',
        })
      }
    }

    // Calcular totais (pessoas únicas por ministério)
    for (const key of Object.keys(ministryMap)) {
      const uniqueEmails = new Set(ministryMap[key].members.map(m => m.email))
      ministryMap[key].total = uniqueEmails.size
    }
  }

  // Ordenar por total (maior primeiro)
  const ministryStats = Object.values(ministryMap).sort((a, b) => b.total - a.total)

  // Inscrições recentes
  const { data: recentSignups } = await serviceClient
    .from('ministry_signups')
    .select('id, name, email, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // Contar ministérios por inscrição recente
  let recentWithCount: any[] = []
  if (recentSignups && recentSignups.length > 0) {
    const signupIds = recentSignups.map(s => s.id)
    const { data: recentSelections } = await serviceClient
      .from('ministry_signup_selections')
      .select('signup_id')
      .in('signup_id', signupIds)

    const countMap: Record<string, number> = {}
    if (recentSelections) {
      for (const s of recentSelections) {
        countMap[s.signup_id] = (countMap[s.signup_id] || 0) + 1
      }
    }

    recentWithCount = recentSignups.map(s => ({
      ...s,
      ministry_count: countMap[s.id] || 0,
    }))
  }

  // Inscrições com "outro ministério" (não encontraram na lista)
  const { data: otherMinistrySignups } = await serviceClient
    .from('ministry_signups')
    .select('id, name, email, other_ministry, other_role, created_at')
    .not('other_ministry', 'is', null)
    .neq('other_ministry', '')
    .order('created_at', { ascending: false })

  return NextResponse.json({
    totalSignups: totalSignups || 0,
    lastSignupDate: lastSignup?.created_at || null,
    ministryStats,
    recentSignups: recentWithCount,
    otherMinistrySignups: otherMinistrySignups || [],
  })
}
