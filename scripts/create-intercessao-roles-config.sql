-- Nova tabela: configuração de papéis por membro na Intercessão
-- Cada membro pode ser habilitado em uma ou mais funções
CREATE TABLE IF NOT EXISTS intercessao_member_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES ministry_members(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN (
    'torre_domingo', 'torre_sexta', 'torre_strong', 'torre_empoderadas',
    'intercessor', 'coluna', 'suporte'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, role_type)
);

-- Configuração por evento: quantas pessoas de cada função por celebração
-- e filtro de gênero do evento
CREATE TABLE IF NOT EXISTS intercessao_event_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scale_name TEXT NOT NULL, -- 'CELEBRAÇÃO', 'STRONGBROTHERS', 'EMPODERADAS', 'VIGÍLIA', 'SALA DE CURA'
  role_type TEXT NOT NULL CHECK (role_type IN ('torre', 'intercessor', 'coluna', 'suporte')),
  num_people INTEGER NOT NULL DEFAULT 1,
  gender_filter TEXT NOT NULL DEFAULT 'any' CHECK (gender_filter IN ('male', 'female', 'any')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scale_name, role_type)
);

-- Inserir configuração padrão
INSERT INTO intercessao_event_config (scale_name, role_type, num_people, gender_filter) VALUES
  ('CELEBRAÇÃO', 'torre', 1, 'any'),
  ('CELEBRAÇÃO', 'intercessor', 2, 'any'),
  ('CELEBRAÇÃO', 'coluna', 1, 'any'),
  ('CELEBRAÇÃO', 'suporte', 2, 'any'),
  ('STRONGBROTHERS', 'torre', 1, 'male'),
  ('STRONGBROTHERS', 'intercessor', 6, 'male'),
  ('STRONGBROTHERS', 'coluna', 0, 'male'),
  ('STRONGBROTHERS', 'suporte', 1, 'male'),
  ('EMPODERADAS', 'torre', 1, 'female'),
  ('EMPODERADAS', 'intercessor', 2, 'female'),
  ('EMPODERADAS', 'coluna', 1, 'female'),
  ('EMPODERADAS', 'suporte', 2, 'female'),
  ('VIGÍLIA', 'torre', 1, 'any'),
  ('VIGÍLIA', 'intercessor', 99, 'any'),
  ('VIGÍLIA', 'coluna', 0, 'any'),
  ('VIGÍLIA', 'suporte', 99, 'any'),
  ('SALA DE CURA', 'torre', 0, 'any'),
  ('SALA DE CURA', 'intercessor', 1, 'any'),
  ('SALA DE CURA', 'coluna', 0, 'any'),
  ('SALA DE CURA', 'suporte', 0, 'any')
ON CONFLICT (scale_name, role_type) DO NOTHING;

-- Adicionar coluna gender na ministry_members se não existir
ALTER TABLE ministry_members ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));
