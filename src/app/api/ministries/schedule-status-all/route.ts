import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const serviceClient = await createServiceRoleClient()

  // Find all ministry_schedules that have events for this month
  const { data: schedules } = await serviceClient
    .from('ministry_schedules')
    .select('ministry_id')
    .eq('month', month)
    .eq('year', year)

  const ministryIds = [...new Set((schedules || []).map(s => s.ministry_id))]

  return NextResponse.json({ ministryIds })
}
