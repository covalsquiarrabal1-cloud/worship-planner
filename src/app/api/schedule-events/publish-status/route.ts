import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  if (!month || !year) {
    return NextResponse.json({ error: 'month e year obrigatórios' }, { status: 400 })
  }

  const serviceClient = await createServiceRoleClient()
  const { data: schedule } = await serviceClient
    .from('schedules')
    .select('id, is_published')
    .eq('month', parseInt(month))
    .eq('year', parseInt(year))
    .single()

  if (!schedule) {
    return NextResponse.json({ is_published: false })
  }

  return NextResponse.json({ is_published: schedule.is_published })
}
