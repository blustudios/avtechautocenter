
-- Clientes table
CREATE TABLE public.clientes (
  cpf text PRIMARY KEY,
  nome text NOT NULL,
  email text,
  whatsapp text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Carros table
CREATE TABLE public.carros (
  placa text PRIMARY KEY,
  cliente_cpf text NOT NULL REFERENCES public.clientes(cpf) ON DELETE CASCADE,
  marca text,
  modelo text,
  ano integer,
  cor text
);
ALTER TABLE public.carros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage carros" ON public.carros FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fornecedores table
CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  endereco text,
  identificacao_extrato text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage fornecedores" ON public.fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Maquininhas table
CREATE TABLE public.maquininhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maquininhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage maquininhas" ON public.maquininhas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bandeiras table
CREATE TABLE public.bandeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maquininha_id uuid NOT NULL REFERENCES public.maquininhas(id) ON DELETE CASCADE,
  nome text NOT NULL
);
ALTER TABLE public.bandeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage bandeiras" ON public.bandeiras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Taxas table
CREATE TABLE public.taxas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bandeira_id uuid NOT NULL REFERENCES public.bandeiras(id) ON DELETE CASCADE,
  tipo_pagamento text NOT NULL,
  parcelas_de integer,
  parcelas_ate integer,
  percentual numeric NOT NULL DEFAULT 0
);
ALTER TABLE public.taxas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage taxas" ON public.taxas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Servicos table
CREATE TABLE public.servicos (
  id text PRIMARY KEY,
  cliente_cpf text REFERENCES public.clientes(cpf),
  carro_placa text REFERENCES public.carros(placa),
  data_entrada date NOT NULL DEFAULT CURRENT_DATE,
  data_encerramento date,
  status text NOT NULL DEFAULT 'a_iniciar',
  valor_total numeric NOT NULL DEFAULT 0,
  valor_liquido numeric NOT NULL DEFAULT 0,
  custo_total numeric NOT NULL DEFAULT 0,
  lucro_liquido numeric NOT NULL DEFAULT 0,
  status_pagamento text NOT NULL DEFAULT 'pendente',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage servicos" ON public.servicos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Servicos itens table
CREATE TABLE public.servicos_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id text NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  ordem integer NOT NULL DEFAULT 0
);
ALTER TABLE public.servicos_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage servicos_itens" ON public.servicos_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Servicos pagamentos table
CREATE TABLE public.servicos_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id text NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  maquininha_id uuid REFERENCES public.maquininhas(id),
  bandeira_id uuid REFERENCES public.bandeiras(id),
  parcelas integer,
  valor numeric NOT NULL DEFAULT 0,
  taxa_aplicada numeric NOT NULL DEFAULT 0
);
ALTER TABLE public.servicos_pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage servicos_pagamentos" ON public.servicos_pagamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Servicos custos table
CREATE TABLE public.servicos_custos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id text NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  item text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  valor numeric NOT NULL DEFAULT 0
);
ALTER TABLE public.servicos_custos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage servicos_custos" ON public.servicos_custos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Estoque pneus table
CREATE TABLE public.estoque_pneus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca text NOT NULL,
  medida_01 text NOT NULL,
  medida_02 text NOT NULL,
  aro text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0,
  valor_medio_compra numeric NOT NULL DEFAULT 0,
  valor_venda numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.estoque_pneus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage estoque_pneus" ON public.estoque_pneus FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function to generate next service ID
CREATE OR REPLACE FUNCTION public.generate_service_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text;
  seq_num integer;
  new_id text;
BEGIN
  prefix := to_char(now(), 'YYMM') || 'C';
  SELECT COALESCE(MAX(
    CAST(substring(id from length(prefix) + 1) AS integer)
  ), 0) + 1
  INTO seq_num
  FROM public.servicos
  WHERE id LIKE prefix || '%';
  new_id := prefix || lpad(seq_num::text, 2, '0');
  RETURN new_id;
END;
$$;
