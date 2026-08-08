import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

// GET: Load event config
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('intercessao_event_config')
    .select('*')
    .order('scale_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST: Save event config
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json()
  const { configs } = body as {
    configs: { scale_name: string; role_type: string; num_people: number; gender_filter: string }[]
  }

  if (!Array.isArray(configs)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  for (const cfg of configs) {
    await serviceClient.from('intercessao_event_config').upsert(cfg, {
      onConflict: 'scale_name,role_type',
    })
  }

  return NextResponse.json({ success: true })
}
