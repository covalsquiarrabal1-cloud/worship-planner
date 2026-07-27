import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { orderedIds } = await request.json()

  if (!orderedIds || !Array.isArray(orderedIds)) {
    return NextResponse.json({ error: 'orderedIds obrigatório' }, { status: 400 })
  }

  // Update sort_order for each member
  for (let i = 0; i < orderedIds.length; i++) {
    await serviceClient
      .from('members')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
  }

  return NextResponse.json({ success: true })
}
