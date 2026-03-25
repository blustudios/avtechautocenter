
-- Migrate old status values
UPDATE public.servicos SET status = 'em_progresso' WHERE status = 'a_iniciar';
UPDATE public.servicos SET status = 'finalizado' WHERE status = 'entregue';
