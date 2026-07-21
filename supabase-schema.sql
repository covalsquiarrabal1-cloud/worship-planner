-- ============================================
-- WORSHIP PLANNER - Database Schema
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  is_leader BOOLEAN DEFAULT FALSE,
  is_back BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  instrument TEXT, -- guitarra, baixo, bateria, teclado, etc.
  is_musician BOOLEAN DEFAULT FALSE,
  email TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specific blocks (member blocked on specific dates)
CREATE TABLE IF NOT EXISTS member_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scale types (names of scales like ALIVE, CELEBRAÇÃO, STRONGBROTHERS, etc.)
CREATE TABLE IF NOT EXISTS scale_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'normal' CHECK (type IN ('normal', 'strong_brothers', 'empoderadas')),
  male_vocals INTEGER NOT NULL DEFAULT 1,
  female_vocals INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly schedules (calendar)
CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

-- Schedule events (each day/celebration in a schedule)
CREATE TABLE IF NOT EXISTS schedule_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  scale_type_id UUID REFERENCES scale_types(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule assignments (who is assigned to what in each event)
CREATE TABLE IF NOT EXISTS schedule_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES schedule_events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('vocal_1', 'vocal_2', 'vocal_3', 'guitarra', 'baixo', 'bateria', 'teclado', 'back')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Songs/Worship setlist
CREATE TABLE IF NOT EXISTS songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES schedule_events(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL,
  title TEXT NOT NULL,
  version TEXT,
  minister TEXT,
  youtube_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scale_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Members policies (everyone can read, admin can write)
CREATE POLICY "Everyone can view members" ON members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can insert members" ON members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can update members" ON members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can delete members" ON members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Member blocks policies
CREATE POLICY "Everyone can view blocks" ON member_blocks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage blocks" ON member_blocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Scale types policies
CREATE POLICY "Everyone can view scale types" ON scale_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage scale types" ON scale_types
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Schedules policies
CREATE POLICY "Everyone can view schedules" ON schedules
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage schedules" ON schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Schedule events policies
CREATE POLICY "Everyone can view events" ON schedule_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage events" ON schedule_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Schedule assignments policies
CREATE POLICY "Everyone can view assignments" ON schedule_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage assignments" ON schedule_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Songs policies
CREATE POLICY "Everyone can view songs" ON songs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage songs" ON songs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = 'covalsqui.arrabal1@gmail.com' THEN 'admin' ELSE 'member' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
