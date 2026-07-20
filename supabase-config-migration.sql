-- ============================================
-- NEW TABLE: instruments (lista de instrumentos disponíveis)
-- ============================================
CREATE TABLE IF NOT EXISTS instruments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir instrumentos padrão
INSERT INTO instruments (name) VALUES 
  ('Guitarra'),
  ('Violão'),
  ('Baixo'),
  ('Bateria'),
  ('Teclado')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- NEW TABLE: band_pattern (padrão de formação da banda)
-- ============================================
CREATE TABLE IF NOT EXISTS band_pattern (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  gender_filter TEXT CHECK (gender_filter IN ('male', 'female', 'any')),
  is_vocal BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir padrão de banda
INSERT INTO band_pattern (role_name, quantity, gender_filter, is_vocal, sort_order) VALUES
  ('Vocal Masculino', 1, 'male', true, 1),
  ('Vocal Feminino', 2, 'female', true, 2);

-- RLS
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_pattern ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view instruments" ON instruments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage instruments" ON instruments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Everyone can view band_pattern" ON band_pattern
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage band_pattern" ON band_pattern
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
