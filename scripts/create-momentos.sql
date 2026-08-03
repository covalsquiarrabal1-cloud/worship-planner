-- Escala de Momentos (Intercessão Alive)
CREATE TABLE IF NOT EXISTS ministry_momentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  culto TEXT NOT NULL,
  momento TEXT,
  member_id UUID REFERENCES ministry_members(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
