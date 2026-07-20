import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  const { searchParams } = new URL(request.url)
  const memberId = searchParams.get('member_id')

  let query = serviceClient
    .from('member_day_blocks')
    .select('*, member:members(id, name)')
    .order('day_of_week')

  if (memberId) {
    query = query.eq('member_id', memberId)
  }

  const { data, error } = await query
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

  const { member_id, days } = await request.json() as { member_id: string; days: number[] }

  if (!member_id || !Array.isArray(days)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Delete existing blocks for this member
  await serviceClient
    .from('member_day_blocks')
    .delete()
    .eq('member_id', member_id)

  // Insert new blocks
  if (days.length > 0) {
    const rows = days.map(day_of_week => ({ member_id, day_of_week }))
    const { error } = await serviceClient
      .from('member_day_blocks')
      .insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
