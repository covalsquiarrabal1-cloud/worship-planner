import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Get ministry id
  const { data: ministry } = await serviceClient
    .from('ministries')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  // Get config
  const { data, error } = await serviceClient
    .from('ministry_scale_config')
    .select('scale_name, num_people')
    .eq('ministry_id', ministry.id)
    .order('scale_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Verify admin
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Get ministry id
  const { data: ministry } = await serviceClient
    .from('ministries')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const body = await request.json()
  const { config } = body // Array of { scale_name, num_people }

  if (!Array.isArray(config)) return NextResponse.json({ error: 'Config inválida' }, { status: 400 })

  // Delete existing config for this ministry
  await serviceClient
    .from('ministry_scale_config')
    .delete()
    .eq('ministry_id', ministry.id)

  // Insert new config
  if (config.length > 0) {
    const rows = config.map((c: { scale_name: string; num_people: number }) => ({
      ministry_id: ministry.id,
      scale_name: c.scale_name,
      num_people: c.num_people,
    }))

    const { error } = await serviceClient
      .from('ministry_scale_config')
      .insert(rows)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
