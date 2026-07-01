
ALTER TABLE public.servicos_pneus
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS medida_01 text,
  ADD COLUMN IF NOT EXISTS medida_02 text,
  ADD COLUMN IF NOT EXISTS aro text,
  ADD COLUMN IF NOT EXISTS tipo text;

UPDATE public.servicos_pneus sp
SET marca = ep.marca,
    medida_01 = ep.medida_01,
    medida_02 = ep.medida_02,
    aro = ep.aro,
    tipo = ep.tipo
FROM public.estoque_pneus ep
WHERE sp.pneu_id = ep.id
  AND (sp.marca IS NULL OR sp.medida_01 IS NULL);

ALTER TABLE public.servicos_pneus ALTER COLUMN pneu_id DROP NOT NULL;

ALTER TABLE public.servicos_pneus DROP CONSTRAINT IF EXISTS servicos_pneus_pneu_id_fkey;
ALTER TABLE public.servicos_pneus
  ADD CONSTRAINT servicos_pneus_pneu_id_fkey
  FOREIGN KEY (pneu_id) REFERENCES public.estoque_pneus(id) ON DELETE SET NULL;
