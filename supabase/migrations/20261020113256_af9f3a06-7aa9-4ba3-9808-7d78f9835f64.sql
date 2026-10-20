CREATE TABLE public.financeiro_caixa_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_referencia date NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  descricao text NOT NULL DEFAULT '',
  servico_pagamento_id uuid UNIQUE REFERENCES public.servicos_pagamentos(id) ON DELETE SET NULL,
  servico_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_caixa_movimentos TO authenticated;
GRANT ALL ON public.financeiro_caixa_movimentos TO service_role;
ALTER TABLE public.financeiro_caixa_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage fin_caixa_mov" ON public.financeiro_caixa_movimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX ON public.financeiro_caixa_movimentos (mes_referencia);