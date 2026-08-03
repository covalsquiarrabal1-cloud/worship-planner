-- Equipes da Intercessão (específico deste ministério)
CREATE TABLE IF NOT EXISTS intercessao_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- "Equipe 1", "Equipe 2", "Mulheres", "Homens", "Geral"
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  torre_member_id UUID REFERENCES ministry_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, month, year)
);

-- Membros de cada equipe da Intercessão
CREATE TABLE IF NOT EXISTS intercessao_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES intercessao_teams(id) ON DELETE CASCADE,
  member_id UUID REFERENCES ministry_members(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'intercessor' CHECK (role IN ('intercessor', 'suporte')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, member_id)
);
