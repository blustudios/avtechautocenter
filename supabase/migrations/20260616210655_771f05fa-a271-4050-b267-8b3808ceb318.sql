
-- Categorias de saída
CREATE TABLE public.financeiro_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_categorias TO authenticated;
GRANT ALL ON public.financeiro_categorias TO service_role;
ALTER TABLE public.financeiro_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage fin_categorias" ON public.financeiro_categorias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Origens
CREATE TABLE public.financeiro_origens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida')),
  is_default boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_origens TO authenticated;
GRANT ALL ON public.financeiro_origens TO service_role;
ALTER TABLE public.financeiro_origens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage fin_origens" ON public.financeiro_origens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Recorrências
CREATE TABLE public.financeiro_recorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  frequencia text NOT NULL CHECK (frequencia IN ('semanal','mensal','anual')),
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_recorrencias TO authenticated;
GRANT ALL ON public.financeiro_recorrencias TO service_role;
ALTER TABLE public.financeiro_recorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage fin_recorrencias" ON public.financeiro_recorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lançamentos
CREATE TABLE public.financeiro_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida')),
  data date NOT NULL,
  descricao text NOT NULL,
  categoria_id uuid REFERENCES public.financeiro_categorias(id),
  origem_id uuid REFERENCES public.financeiro_origens(id),
  valor_previsto numeric NOT NULL DEFAULT 0,
  valor_realizado numeric NOT NULL DEFAULT 0,
  status_pagamento text CHECK (status_pagamento IN ('a_pagar','agendado','pago')),
  recorrencia_id uuid REFERENCES public.financeiro_recorrencias(id) ON DELETE SET NULL,
  is_auto boolean NOT NULL DEFAULT false,
  mes_referencia date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fin_lanc_mes ON public.financeiro_lancamentos(mes_referencia);
CREATE INDEX idx_fin_lanc_data ON public.financeiro_lancamentos(data);
CREATE INDEX idx_fin_lanc_recor ON public.financeiro_lancamentos(recorrencia_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_lancamentos TO authenticated;
GRANT ALL ON public.financeiro_lancamentos TO service_role;
ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage fin_lancamentos" ON public.financeiro_lancamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Caixa
CREATE TABLE public.financeiro_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_referencia date NOT NULL UNIQUE,
  saldo_conta_pj numeric NOT NULL DEFAULT 0,
  saldo_dinheiro numeric NOT NULL DEFAULT 0,
  saldo_stone numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_caixa TO authenticated;
GRANT ALL ON public.financeiro_caixa TO service_role;
ALTER TABLE public.financeiro_caixa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage fin_caixa" ON public.financeiro_caixa FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seeds categorias
INSERT INTO public.financeiro_categorias (nome, is_default, is_system) VALUES
('Despesas Fixas', true, false),
('Salários / Pró-labore', true, false),
('Investimentos', true, false),
('Freelances', true, false),
('Insumos para a loja', true, false),
('Deslocamento', true, false),
('Alimentação', true, false),
('Infraestrutura', true, false),
('Compra de Pneus', true, false),
('Dívidas', true, false),
('Compras Diversas', true, false),
('Retiradas', true, true),
('Custos de Serviço', true, true);

-- Seeds origens
INSERT INTO public.financeiro_origens (nome, tipo, is_default, is_system) VALUES
('PIX Inter PJ', 'saida', true, false),
('Débito Inter PJ', 'saida', true, false),
('Dinheiro', 'saida', true, false),
('Aporte', 'entrada', true, false),
('Entrada de Serviços', 'entrada', true, true);
