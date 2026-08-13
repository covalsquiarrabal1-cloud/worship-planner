import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const email = user.email?.toLowerCase() || ''

  // Check if member is in louvor (members table)
  const { data: worshipMember } = await serviceClient
    .from('members')
    .select('id, name')
    .ilike('email', email)
    .single()

  // Check which ministries the member belongs to
  const { data: ministryMemberships } = await serviceClient
    .from('ministry_members')
    .select('ministry_id, ministries(id, name, slug)')
    .ilike('email', email)
    .eq('is_blocked', false)

  const ministries = (ministryMemberships || [])
    .map((mm: any) => mm.ministries)
    .filter(Boolean)
    .filter((m: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === m.id) === i) // dedupe

  return NextResponse.json({
    isWorshipMember: !!worshipMember,
    ministries,
  })
}
