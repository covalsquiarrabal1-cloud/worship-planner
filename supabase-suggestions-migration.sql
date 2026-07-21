-- ============================================
-- NEW TABLE: song_suggestions (sugestões de louvores dos membros)
-- ============================================
CREATE TABLE IF NOT EXISTS song_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_name TEXT NOT NULL,
  member_email TEXT,
  link TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE song_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can insert suggestions" ON song_suggestions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Everyone can view suggestions" ON song_suggestions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage suggestions" ON song_suggestions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
