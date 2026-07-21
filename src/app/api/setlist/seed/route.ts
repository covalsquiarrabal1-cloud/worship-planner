import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { count } = await serviceClient
    .from('setlist').select('*', { count: 'exact', head: true })
  if (count && count > 0)
    return NextResponse.json({ error: 'Set list já importada' }, { status: 400 })

  return NextResponse.json({
    error: 'Execute o SQL de seed no Supabase para importar os dados'
  }, { status: 400 })
}
