-- Migrar serviços legados: a_iniciar → em_progresso
UPDATE servicos SET status = 'em_progresso' WHERE status = 'a_iniciar';

-- Migrar serviços legados: entregue → finalizado
UPDATE servicos SET status = 'finalizado' WHERE status = 'entregue';