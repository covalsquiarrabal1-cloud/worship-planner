-- Membros da Escala Momentos (lista própria, separada da intercessão alive)
CREATE TABLE IF NOT EXISTS momentos_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remover FK antigo e adicionar novo
ALTER TABLE ministry_momentos DROP CONSTRAINT IF EXISTS ministry_momentos_member_id_fkey;
ALTER TABLE ministry_momentos ADD CONSTRAINT ministry_momentos_member_id_fkey FOREIGN KEY (member_id) REFERENCES momentos_members(id);
