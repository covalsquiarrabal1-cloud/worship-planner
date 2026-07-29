import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key) {
    const { data, error } = await serviceClient
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single()
    // If table doesn't exist or key not found, return default
    if (error) return NextResponse.json({ key, value: null })
    return NextResponse.json({ key, value: data?.value ?? null })
  }

  const { data, error } = await serviceClient
    .from('app_settings')
    .select('*')

  if (error) return NextResponse.json([])
  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Only admin can change settings
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { key, value } = await request.json()
  if (!key) return NextResponse.json({ error: 'key obrigatória' }, { status: 400 })

  // Upsert
  const { data: existing } = await serviceClient
    .from('app_settings')
    .select('id')
    .eq('key', key)
    .single()

  if (existing) {
    await serviceClient
      .from('app_settings')
      .update({ value })
      .eq('key', key)
  } else {
    await serviceClient
      .from('app_settings')
      .insert({ key, value })
  }

  return NextResponse.json({ success: true })
}
