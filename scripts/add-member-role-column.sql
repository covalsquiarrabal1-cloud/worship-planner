-- Adicionar coluna role na tabela ministry_members
ALTER TABLE ministry_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'membro' CHECK (role IN ('membro', 'lider', 'ambos'));
