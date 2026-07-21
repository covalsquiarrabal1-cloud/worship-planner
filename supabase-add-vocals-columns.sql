-- ============================================
-- ADD male_vocals and female_vocals columns to scale_types
-- ============================================
ALTER TABLE scale_types 
  ADD COLUMN IF NOT EXISTS male_vocals INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS female_vocals INTEGER NOT NULL DEFAULT 2;
