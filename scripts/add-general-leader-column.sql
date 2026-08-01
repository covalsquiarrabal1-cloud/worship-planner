-- Adicionar coluna is_general_leader na tabela members
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_general_leader BOOLEAN DEFAULT FALSE;
