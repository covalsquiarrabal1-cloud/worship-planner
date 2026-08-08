import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const serviceClient = await createServiceRoleClient()
  const { data: ministry } = await serviceClient
    .from('ministries').select('id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ is_published: false })

  // Use app_settings to store momentos publish status
  const { data } = await serviceClient
    .from('app_settings')
    .select('value')
    .eq('key', `momentos_published_${ministry.id}_${month}_${year}`)
    .single()

  return NextResponse.json({ is_published: data?.value === 'true' })
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()

  const { data: ministry } = await serviceClient
    .from('ministries').select('id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const { month, year, is_published } = await request.json()

  await serviceClient
    .from('app_settings')
    .upsert(
      { key: `momentos_published_${ministry.id}_${month}_${year}`, value: String(is_published) },
      { onConflict: 'key' }
    )

  return NextResponse.json({ success: true, is_published })
}
