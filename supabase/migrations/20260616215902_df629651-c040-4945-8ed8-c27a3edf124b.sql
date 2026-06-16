ALTER TABLE public.financeiro_lancamentos
  ADD COLUMN IF NOT EXISTS observacoes TEXT NULL,
  ADD COLUMN IF NOT EXISTS parcela_atual INT NULL,
  ADD COLUMN IF NOT EXISTS parcela_total INT NULL,
  ADD COLUMN IF NOT EXISTS parcela_grupo_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_parcela_grupo
  ON public.financeiro_lancamentos(parcela_grupo_id);