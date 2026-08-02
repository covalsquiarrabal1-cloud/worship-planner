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

  const body = await request.json()
  const { email, name, ministry_ids } = body

  if (!email || !Array.isArray(ministry_ids)) {
    return NextResponse.json({ error: 'Email e ministry_ids obrigatórios' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const capitalizedName = name ? name.trim().toLowerCase().split(/\s+/)
    .map((w: string, i: number) => {
      if (i > 0 && ['de','da','do','das','dos','e','em','na','no','nas','nos'].includes(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1)
    }).join(' ') : ''

  // Get current ministry memberships for this person
  const { data: currentMemberships } = await serviceClient
    .from('ministry_members')
    .select('id, ministry_id')
    .ilike('email', normalizedEmail)

  const currentMinistryIds = (currentMemberships || []).map(m => m.ministry_id)

  // Ministries to add
  const toAdd = ministry_ids.filter((id: string) => !currentMinistryIds.includes(id))
  // Ministries to remove
  const toRemove = currentMinistryIds.filter(id => !ministry_ids.includes(id))

  // Add new memberships
  if (toAdd.length > 0) {
    const rows = toAdd.map((ministry_id: string) => ({
      ministry_id,
      name: capitalizedName,
      email: normalizedEmail,
      role: 'membro',
    }))
    await serviceClient.from('ministry_members').insert(rows)
  }

  // Remove old memberships
  if (toRemove.length > 0) {
    for (const ministryId of toRemove) {
      await serviceClient
        .from('ministry_members')
        .delete()
        .ilike('email', normalizedEmail)
        .eq('ministry_id', ministryId)
    }
  }

  return NextResponse.json({ success: true })
}
