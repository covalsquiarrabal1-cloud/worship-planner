import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Buscar ministérios e funções em paralelo
  const [ministriesRes, rolesRes, assignmentsRes] = await Promise.all([
    serviceClient.from('ministries').select('id', { count: 'exact', head: true }),
    serviceClient.from('person_roles').select('id, name').order('name'),
    serviceClient.from('member_person_roles').select('member_email, role_id'),
  ])

  // Contar por função
  const roleCounts: { id: string; name: string; count: number }[] = []
  const roles = rolesRes.data || []
  const assignments = assignmentsRes.data || []

  for (const role of roles) {
    const count = assignments.filter(a => a.role_id === role.id).length
    roleCounts.push({ id: role.id, name: role.name, count })
  }

  // Total de pessoas únicas (por email)
  const uniqueEmails = new Set(assignments.map(a => a.member_email))

  return NextResponse.json({
    ministries: ministriesRes.count || 0,
    totalPeople: uniqueEmails.size,
    roleCounts,
  })
}
