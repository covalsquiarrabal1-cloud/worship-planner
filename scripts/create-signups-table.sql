-- ============================================
-- TABELA DE INSCRIÇÕES (FORMULÁRIO PÚBLICO)
-- ============================================

CREATE TABLE IF NOT EXISTS ministry_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  birth_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cada ministério selecionado pela pessoa no formulário
CREATE TABLE IF NOT EXISTS ministry_signup_selections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signup_id UUID REFERENCES ministry_signups(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('membro', 'lider')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca por email
CREATE INDEX IF NOT EXISTS idx_ministry_signups_email ON ministry_signups(email);

-- RLS: permitir INSERT público (formulário sem login)
ALTER TABLE ministry_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_signup_selections ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserts anônimos
CREATE POLICY "Allow public inserts on ministry_signups"
  ON ministry_signups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public inserts on ministry_signup_selections"
  ON ministry_signup_selections FOR INSERT
  WITH CHECK (true);

-- Apenas admins podem ler
CREATE POLICY "Admins can read ministry_signups"
  ON ministry_signups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can read ministry_signup_selections"
  ON ministry_signup_selections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
