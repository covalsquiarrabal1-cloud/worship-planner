-- Setar grupos nos ministérios existentes
UPDATE ministries SET group_name = 'Integração' WHERE slug IN ('conexao', 'excelencia', 'centurioes', 'servos');
UPDATE ministries SET group_name = 'Culto' WHERE slug IN ('iluminacao', 'som', 'projecao', 'backstage');
UPDATE ministries SET group_name = 'Esporte' WHERE slug IN ('ac-soccer', 'ac-volei');
UPDATE ministries SET group_name = 'Comunidade' WHERE slug IN ('empoderadas', 'strong-brothers', 'kids');
UPDATE ministries SET group_name = 'Espiritual' WHERE slug IN ('sala-de-cura', 'intercessao', 'profetico', 'evangelismo');
UPDATE ministries SET group_name = 'Operacional' WHERE slug IN ('decoracao', 'bookstore', 'exito', 'membresia');
UPDATE ministries SET group_name = 'Alive' WHERE slug IN ('alive', 'conexao-alive', 'intercessao-alive', 'ativadas', 'forja');
UPDATE ministries SET group_name = 'Comunicação' WHERE slug IN ('fotografia-creative', 'stories');
UPDATE ministries SET group_name = 'Administrativo' WHERE slug IN ('acao-social', 'financas');
