import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('day_scale_defaults')
    .select('*')
    .order('day_of_week')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { defaults } = body as { defaults: { day_of_week: number; scale_name: string; is_variable: boolean }[] }

  if (!defaults || !Array.isArray(defaults)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Upsert all days
  for (const item of defaults) {
    const { data: existing } = await serviceClient
      .from('day_scale_defaults')
      .select('id')
      .eq('day_of_week', item.day_of_week)
      .single()

    if (existing) {
      await serviceClient
        .from('day_scale_defaults')
        .update({ scale_name: item.scale_name || null, is_variable: item.is_variable })
        .eq('id', existing.id)
    } else {
      await serviceClient
        .from('day_scale_defaults')
        .insert({ day_of_week: item.day_of_week, scale_name: item.scale_name || null, is_variable: item.is_variable })
    }
  }

  return NextResponse.json({ success: true })
}
