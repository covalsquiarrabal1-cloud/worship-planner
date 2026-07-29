import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { slug } = await params
  const serviceClient = await createServiceRoleClient()

  // Get ministry
  const { data: ministry } = await serviceClient
    .from('ministries').select('id, leader_user_id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  // Check permission (admin or leader)
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && ministry.leader_user_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { month, year } = await request.json()
  if (!month || !year) {
    return NextResponse.json({ error: 'Mês e ano obrigatórios' }, { status: 400 })
  }

  // Find the schedule for this month/year
  const { data: schedule } = await serviceClient
    .from('ministry_schedules')
    .select('id, is_published')
    .eq('ministry_id', ministry.id)
    .eq('month', month)
    .eq('year', year)
    .single()

  if (!schedule) {
    return NextResponse.json({ error: 'Nenhuma escala encontrada para este mês' }, { status: 404 })
  }

  // Toggle publish status
  const newStatus = !schedule.is_published
  const { error } = await serviceClient
    .from('ministry_schedules')
    .update({ is_published: newStatus })
    .eq('id', schedule.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, is_published: newStatus })
}
