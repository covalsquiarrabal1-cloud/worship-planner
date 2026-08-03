-- Funções dentro de cada ministério (ex: Intercessor, Líder de sala, Operador de câmera)
CREATE TABLE IF NOT EXISTS ministry_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ministry_id, name)
);

-- Adicionar coluna role_name na tabela ministry_assignments para indicar a função da pessoa naquela escala
ALTER TABLE ministry_assignments ADD COLUMN IF NOT EXISTS role_name TEXT;
