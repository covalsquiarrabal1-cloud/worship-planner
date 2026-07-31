-- Adicionar colunas para "não encontrou seu ministério"
ALTER TABLE ministry_signups ADD COLUMN IF NOT EXISTS other_ministry TEXT;
ALTER TABLE ministry_signups ADD COLUMN IF NOT EXISTS other_role TEXT;
