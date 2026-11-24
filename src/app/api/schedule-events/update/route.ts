import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

// Update a single assignment (change, add or remove the member for a role)
export async function PUT(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { event_id, role, member_id } = body
  let assignment_id = body.assignment_id

  if (!assignment_id && (!event_id || !role)) {
    return NextResponse.json({ error: 'assignment_id ou event_id e role obrigatórios' }, { status: 400 })
  }

  // Empty cell: reuse the slot if it was filled meanwhile, otherwise create it
  if (!assignment_id) {
    const { data: existing, error: findError } = await serviceClient
      .from('schedule_assignments')
      .select('id')
      .eq('event_id', event_id)
      .eq('role', role)
      .limit(1)
    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 })
    assignment_id = existing?.[0]?.id
  }

  if (!assignment_id) {
    if (!member_id) return NextResponse.json({ success: true, deleted: true })

    const { data, error } = await serviceClient
      .from('schedule_assignments')
      .insert({ event_id, role, member_id })
      .select('id, role, member:members(id, name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // If member_id is empty, delete the assignment (set to "-")
  if (!member_id) {
    const { error } = await serviceClient
      .from('schedule_assignments')
      .delete()
      .eq('id', assignment_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, deleted: true })
  }

  const { data, error } = await serviceClient
    .from('schedule_assignments')
    .update({ member_id })
    .eq('id', assignment_id)
    .select('id, role, member:members(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
