-- ============================================
-- MULTI-MINISTRY SYSTEM
-- ============================================

-- Ministries table (Som, Iluminação, Projeção, Backstage, etc.)
CREATE TABLE IF NOT EXISTS ministries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  leader_user_id UUID REFERENCES auth.users(id),
  leader_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ministry members (people in each ministry)
CREATE TABLE IF NOT EXISTS ministry_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ministry schedules (monthly schedules per ministry)
CREATE TABLE IF NOT EXISTS ministry_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ministry_id, month, year)
);

-- Ministry events (each day/celebration in a ministry schedule)
CREATE TABLE IF NOT EXISTS ministry_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES ministry_schedules(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  scale_name TEXT,
  num_celebrations INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ministry assignments (who is assigned to what in each event)
CREATE TABLE IF NOT EXISTS ministry_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES ministry_events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES ministry_members(id) ON DELETE CASCADE,
  celebration_number INTEGER NOT NULL DEFAULT 1,
  role TEXT DEFAULT 'operator',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_assignments ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view ministries
CREATE POLICY "Everyone can view ministries" ON ministries
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage ministries" ON ministries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Ministry members: viewable by auth users, manageable by admin or ministry leader
CREATE POLICY "Everyone can view ministry_members" ON ministry_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or leader can manage ministry_members" ON ministry_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM ministries WHERE id = ministry_id AND leader_user_id = auth.uid())
  );

-- Ministry schedules
CREATE POLICY "Everyone can view ministry_schedules" ON ministry_schedules
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or leader can manage ministry_schedules" ON ministry_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM ministries WHERE id = ministry_id AND leader_user_id = auth.uid()
    )
  );

-- Ministry events
CREATE POLICY "Everyone can view ministry_events" ON ministry_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or leader can manage ministry_events" ON ministry_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM ministry_schedules ms
      JOIN ministries m ON m.id = ms.ministry_id
      WHERE ms.id = schedule_id AND m.leader_user_id = auth.uid()
    )
  );

-- Ministry assignments
CREATE POLICY "Everyone can view ministry_assignments" ON ministry_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or leader can manage ministry_assignments" ON ministry_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM ministry_events me
      JOIN ministry_schedules ms ON ms.id = me.schedule_id
      JOIN ministries m ON m.id = ms.ministry_id
      WHERE me.id = event_id AND m.leader_user_id = auth.uid()
    )
  );

-- ============================================
-- INSERT DEFAULT MINISTRIES
-- ============================================

INSERT INTO ministries (name, slug, leader_name) VALUES
  ('Som', 'som', 'Pedro Gustavo'),
  ('Iluminação', 'iluminacao', 'Pedro Afonso'),
  ('Projeção', 'projecao', 'Tatiana'),
  ('Backstage', 'backstage', 'Lilia')
ON CONFLICT (slug) DO NOTHING;

-- Add ministry_leader role to profiles check
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'member', 'ministry_leader'));
