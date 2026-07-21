import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

// Update a single assignment (change member for a role)
export async function PUT(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { assignment_id, member_id } = body

  if (!assignment_id || !member_id) {
    return NextResponse.json({ error: 'assignment_id e member_id obrigatórios' }, { status: 400 })
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
