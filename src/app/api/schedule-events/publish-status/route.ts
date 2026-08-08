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
  const { data: schedules } = await serviceClient
    .from('schedules')
    .select('id, is_published')
    .eq('month', parseInt(month))
    .eq('year', parseInt(year))

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ is_published: false })
  }

  // Consider published if ALL schedules for the month are published
  const allPublished = schedules.every((s: any) => s.is_published)
  return NextResponse.json({ is_published: allPublished })
}
