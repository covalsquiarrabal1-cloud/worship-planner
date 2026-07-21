-- Add missing columns to setlist table
ALTER TABLE setlist
  ADD COLUMN IF NOT EXISTS celebration_type TEXT,
  ADD COLUMN IF NOT EXISTS vocal_type TEXT;
