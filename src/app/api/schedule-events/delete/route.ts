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

  const { month, year } = await request.json()

  // Find the schedule
  const { data: schedule } = await serviceClient
    .from('schedules')
    .select('id')
    .eq('month', month)
    .eq('year', year)
    .single()

  if (!schedule) return NextResponse.json({ error: 'Escala não encontrada' }, { status: 404 })

  // Delete all events (cascade will delete assignments and songs)
  await serviceClient.from('schedule_events').delete().eq('schedule_id', schedule.id)
  
  // Delete the schedule itself
  await serviceClient.from('schedules').delete().eq('id', schedule.id)

  return NextResponse.json({ success: true })
}
