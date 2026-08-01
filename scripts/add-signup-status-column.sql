-- Adicionar coluna status nas seleções do formulário
ALTER TABLE ministry_signup_selections ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'inserido'));
