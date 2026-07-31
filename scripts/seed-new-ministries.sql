-- ============================================
-- INSERIR NOVOS MINISTÉRIOS (sem líderes)
-- ============================================

INSERT INTO ministries (name, slug) VALUES
  ('Conexão', 'conexao'),
  ('Conexão Alive', 'conexao-alive'),
  ('Excelência', 'excelencia'),
  ('Intercessão', 'intercessao'),
  ('Intercessão Alive', 'intercessao-alive'),
  ('Centuriões', 'centurioes'),
  ('Servos', 'servos'),
  ('Fotografia/Creative', 'fotografia-creative'),
  ('Stories', 'stories'),
  ('Profético', 'profetico'),
  ('Kids', 'kids'),
  ('Ac Soccer', 'ac-soccer'),
  ('Ac Vôlei', 'ac-volei'),
  ('Decoração', 'decoracao'),
  ('Ativadas', 'ativadas'),
  ('Forja', 'forja'),
  ('Empoderadas', 'empoderadas'),
  ('Strong Brothers', 'strong-brothers'),
  ('Alive', 'alive'),
  ('Sala de Cura', 'sala-de-cura'),
  ('Ação Social', 'acao-social'),
  ('Finanças', 'financas'),
  ('Bookstore', 'bookstore'),
  ('Êxito', 'exito'),
  ('Evangelismo', 'evangelismo'),
  ('Membresia', 'membresia')
ON CONFLICT (slug) DO NOTHING;
