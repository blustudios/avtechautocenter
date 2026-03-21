CREATE TABLE servicos_pneus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id text NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  pneu_id uuid NOT NULL REFERENCES estoque_pneus(id),
  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0,
  baixa_estoque boolean NOT NULL DEFAULT false
);
ALTER TABLE servicos_pneus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage servicos_pneus" ON servicos_pneus FOR ALL TO authenticated USING (true) WITH CHECK (true);