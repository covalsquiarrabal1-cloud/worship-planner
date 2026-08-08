import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

// GET: Load event config for intercessão ministries
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  // Use the same config table for both intercessao and intercessao-alive
  // They share the same event types but could have different configs
  const prefix = slug === 'intercessao-alive' ? 'ALIVE_' : ''

  const serviceClient = await createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('intercessao_event_config')
    .select('*')
    .order('scale_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // For intercessao-alive, filter configs that start with ALIVE_ or return defaults
  if (slug === 'intercessao-alive') {
    const aliveConfigs = (data || []).filter(d => d.scale_name.startsWith('ALIVE_'))
    if (aliveConfigs.length > 0) {
      // Remove prefix for display
      return NextResponse.json(aliveConfigs.map(c => ({ ...c, scale_name: c.scale_name.replace('ALIVE_', '') })))
    }
    // Fallback: use same config as intercessao
    return NextResponse.json((data || []).filter(d => !d.scale_name.startsWith('ALIVE_')))
  }

  return NextResponse.json((data || []).filter(d => !d.scale_name.startsWith('ALIVE_')))
}

// POST: Save event config
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { configs } = body as {
    configs: { scale_name: string; role_type: string; num_people: number; gender_filter: string }[]
  }

  if (!Array.isArray(configs)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  // For intercessao-alive, prefix scale names
  const prefix = slug === 'intercessao-alive' ? 'ALIVE_' : ''

  for (const cfg of configs) {
    await serviceClient.from('intercessao_event_config').upsert(
      { ...cfg, scale_name: prefix + cfg.scale_name },
      { onConflict: 'scale_name,role_type' }
    )
  }

  return NextResponse.json({ success: true })
}
