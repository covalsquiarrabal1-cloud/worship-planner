-- Migração: adiciona vocal_4 ao CHECK constraint de schedule_assignments
-- Cole no SQL Editor do Supabase (cwfeqngelvknvocvtcna) e clique em Run.

ALTER TABLE schedule_assignments
  DROP CONSTRAINT schedule_assignments_role_check;

ALTER TABLE schedule_assignments
  ADD CONSTRAINT schedule_assignments_role_check
  CHECK (role IN ('vocal_1', 'vocal_2', 'vocal_3', 'vocal_4', 'guitarra', 'baixo', 'bateria', 'teclado', 'back'));
