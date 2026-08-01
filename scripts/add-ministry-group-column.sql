-- Adicionar coluna de grupo na tabela ministries
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT 'Outros';
