import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Buscar todos os membros de ministérios
  const { data: ministryMembers } = await serviceClient
    .from('ministry_members')
    .select('id, name, email, role, ministry_id')
    .order('name')

  // Buscar ministérios
  const { data: ministries } = await serviceClient
    .from('ministries')
    .select('id, name')

  // Buscar dados do formulário (telefone, data nascimento)
  const { data: signups } = await serviceClient
    .from('ministry_signups')
    .select('name, email, phone, birth_date')

  const ministryMap: Record<string, string> = {}
  for (const m of ministries || []) ministryMap[m.id] = m.name

  // Agrupar por email (pessoa única)
  const peopleMap: Record<string, {
    name: string
    email: string
    phone: string | null
    birth_date: string | null
    ministries: { ministry_id: string; ministry_name: string; role: string; member_id: string }[]
  }> = {}

  for (const mm of ministryMembers || []) {
    if (!mm.email) continue
    const key = mm.email.toLowerCase()
    if (!peopleMap[key]) {
      // Buscar telefone e data do formulário
      const signup = (signups || []).find(s => s.email?.toLowerCase() === key)
      peopleMap[key] = {
        name: mm.name,
        email: mm.email,
        phone: signup?.phone || null,
        birth_date: signup?.birth_date || null,
        ministries: [],
      }
    }
    peopleMap[key].ministries.push({
      ministry_id: mm.ministry_id,
      ministry_name: ministryMap[mm.ministry_id] || '?',
      role: mm.role,
      member_id: mm.id,
    })
  }

  // Ordenar alfabeticamente
  const people = Object.values(peopleMap).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return NextResponse.json(people)
}

export async function PUT(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { old_email, new_name, new_email } = body

  if (!old_email || !new_name) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  const capitalizedName = new_name.trim().toLowerCase().split(/\s+/)
    .map((w: string, i: number) => i > 0 && ['de','da','do','das','dos','e','em','na','no','nas','nos'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  const normalizedNewEmail = new_email ? new_email.trim().toLowerCase() : old_email.toLowerCase()

  // Atualizar em ministry_members (todos os registros com esse email)
  await serviceClient
    .from('ministry_members')
    .update({ name: capitalizedName, email: normalizedNewEmail })
    .ilike('email', old_email)

  // Atualizar em ministry_signups
  await serviceClient
    .from('ministry_signups')
    .update({ name: capitalizedName, email: normalizedNewEmail })
    .ilike('email', old_email)

  // Atualizar em members (louvor)
  await serviceClient
    .from('members')
    .update({ name: capitalizedName, email: normalizedNewEmail })
    .ilike('email', old_email)

  // Atualizar em profiles
  await serviceClient
    .from('profiles')
    .update({ full_name: capitalizedName, email: normalizedNewEmail })
    .ilike('email', old_email)

  return NextResponse.json({ success: true })
}
