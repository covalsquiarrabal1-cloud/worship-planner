-- Adicionar campo apelido na tabela ministry_signups (cadastro principal)
ALTER TABLE ministry_signups ADD COLUMN IF NOT EXISTS nickname TEXT;
