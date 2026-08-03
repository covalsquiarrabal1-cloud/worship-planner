-- Configuração de quantas pessoas escalar por tipo de escala em cada ministério
CREATE TABLE IF NOT EXISTS ministry_scale_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  scale_name TEXT NOT NULL,
  num_people INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ministry_id, scale_name)
);
