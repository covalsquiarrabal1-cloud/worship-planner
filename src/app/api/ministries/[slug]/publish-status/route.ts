import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  if (!month || !year) {
    return NextResponse.json({ error: 'month e year obrigatórios' }, { status: 400 })
  }

  const serviceClient = await createServiceRoleClient()

  const { data: ministry } = await serviceClient
    .from('ministries').select('id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ is_published: false })

  const { data: schedule } = await serviceClient
    .from('ministry_schedules')
    .select('id, is_published')
    .eq('ministry_id', ministry.id)
    .eq('month', parseInt(month))
    .eq('year', parseInt(year))
    .single()

  if (!schedule) {
    return NextResponse.json({ is_published: false })
  }

  return NextResponse.json({ is_published: schedule.is_published })
}
