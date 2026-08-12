-- Adicionar função "Secretaria" se não existir
INSERT INTO person_roles (name) VALUES ('Secretaria') ON CONFLICT (name) DO NOTHING;
