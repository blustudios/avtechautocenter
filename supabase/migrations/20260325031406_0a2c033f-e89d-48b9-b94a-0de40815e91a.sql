
-- Add new fields to servicos table
ALTER TABLE public.servicos 
ADD COLUMN IF NOT EXISTS data_orcamento date,
ADD COLUMN IF NOT EXISTS is_servico_rapido boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS carro_marca_livre text,
ADD COLUMN IF NOT EXISTS carro_modelo_livre text,
ADD COLUMN IF NOT EXISTS carro_placa_livre text;

-- Create history tracking table
CREATE TABLE IF NOT EXISTS public.servicos_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id text NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  campo text NOT NULL,
  valor_anterior text,
  valor_novo text,
  alterado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.servicos_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage historico" 
ON public.servicos_historico FOR ALL TO authenticated 
USING (true) WITH CHECK (true);
