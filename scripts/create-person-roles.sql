-- Tabela de funções (Pastor, Ministro, Membro, etc.)
CREATE TABLE IF NOT EXISTS person_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de relação pessoa <-> funções (muitos-para-muitos)
CREATE TABLE IF NOT EXISTS member_person_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_email TEXT NOT NULL,
  role_id UUID REFERENCES person_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_email, role_id)
);

-- Inserir funções padrão
INSERT INTO person_roles (name) VALUES ('Membro') ON CONFLICT (name) DO NOTHING;
INSERT INTO person_roles (name) VALUES ('Pastor') ON CONFLICT (name) DO NOTHING;
INSERT INTO person_roles (name) VALUES ('Ministro') ON CONFLICT (name) DO NOTHING;

-- Atribuir "Membro" a todos os cadastros existentes
-- (usando emails dos ministry_members e members)
INSERT INTO member_person_roles (member_email, role_id)
SELECT DISTINCT LOWER(email), (SELECT id FROM person_roles WHERE name = 'Membro')
FROM members WHERE email IS NOT NULL
ON CONFLICT (member_email, role_id) DO NOTHING;

INSERT INTO member_person_roles (member_email, role_id)
SELECT DISTINCT LOWER(email), (SELECT id FROM person_roles WHERE name = 'Membro')
FROM ministry_members WHERE email IS NOT NULL
ON CONFLICT (member_email, role_id) DO NOTHING;
