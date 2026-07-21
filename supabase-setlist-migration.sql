-- ============================================
-- NEW TABLE: setlist (repertório completo de louvores)
-- ============================================
CREATE TABLE IF NOT EXISTS setlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  version TEXT,
  worship_type TEXT,
  description TEXT,
  key TEXT,
  status TEXT NOT NULL DEFAULT 'ON' CHECK (status IN ('ON', 'OFF')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE setlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view setlist" ON setlist
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage setlist" ON setlist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
