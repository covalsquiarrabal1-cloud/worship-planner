-- Adicionar campo apelido na tabela ministry_members
ALTER TABLE ministry_members ADD COLUMN IF NOT EXISTS nickname TEXT;
