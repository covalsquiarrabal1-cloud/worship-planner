import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const serviceClient = await createServiceRoleClient()

  const { data: teams, error } = await serviceClient
    .from('intercessao_teams')
    .select(`
      id, name, month, year, coluna_member_id,
      torre_member:ministry_members!intercessao_teams_torre_member_id_fkey(id, name),
      members:intercessao_team_members(
        id, role,
        member:ministry_members(id, name)
      )
    `)
    .eq('month', month)
    .eq('year', year)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(teams || [])
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json()
  const { teams, month, year } = body

  if (!Array.isArray(teams) || !month || !year) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Delete existing teams for this month
  const { data: existingTeams } = await serviceClient
    .from('intercessao_teams')
    .select('id')
    .eq('month', month)
    .eq('year', year)

  if (existingTeams && existingTeams.length > 0) {
    const teamIds = existingTeams.map(t => t.id)
    await serviceClient.from('intercessao_team_members').delete().in('team_id', teamIds)
    await serviceClient.from('intercessao_teams').delete().eq('month', month).eq('year', year)
  }

  // Insert new teams
  for (const team of teams) {
    const { data: newTeam, error: teamError } = await serviceClient
      .from('intercessao_teams')
      .insert({
        name: team.name,
        month,
        year,
        torre_member_id: team.torre_member_id || null,
        coluna_member_id: team.coluna_member_id || null,
      })
      .select()
      .single()

    if (teamError || !newTeam) continue

    // Insert team members
    if (team.members && team.members.length > 0) {
      const memberRows = team.members.map((m: { member_id: string; role: string }) => ({
        team_id: newTeam.id,
        member_id: m.member_id,
        role: m.role || 'intercessor',
      }))
      await serviceClient.from('intercessao_team_members').insert(memberRows)
    }
  }

  return NextResponse.json({ success: true })
}
