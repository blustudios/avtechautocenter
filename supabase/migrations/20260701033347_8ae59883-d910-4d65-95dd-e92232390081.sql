
CREATE TABLE public.marcas_pneus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX marcas_pneus_nome_uniq ON public.marcas_pneus (LOWER(TRIM(nome)));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marcas_pneus TO authenticated;
GRANT ALL ON public.marcas_pneus TO service_role;
ALTER TABLE public.marcas_pneus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage marcas_pneus" ON public.marcas_pneus FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.estoque_pneus_compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pneu_id uuid NOT NULL REFERENCES public.estoque_pneus(id) ON DELETE CASCADE,
  data_compra date NOT NULL DEFAULT CURRENT_DATE,
  quantidade integer NOT NULL,
  valor_unitario numeric NOT NULL DEFAULT 0,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX estoque_pneus_compras_pneu_data_idx ON public.estoque_pneus_compras (pneu_id, data_compra DESC, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_pneus_compras TO authenticated;
GRANT ALL ON public.estoque_pneus_compras TO service_role;
ALTER TABLE public.estoque_pneus_compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage estoque_pneus_compras" ON public.estoque_pneus_compras FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.estoque_pneus ADD COLUMN marca_id uuid REFERENCES public.marcas_pneus(id);

-- Insere marcas já consolidadas (aplicando mapeamento antes de deduplicar)
WITH normalized AS (
  SELECT DISTINCT
    CASE
      WHEN LOWER(TRIM(marca)) IN ('sunni','sunny') THEN 'sunny'
      WHEN LOWER(TRIM(marca)) IN ('gallant','galant') THEN 'gallant'
      WHEN LOWER(TRIM(marca)) IN ('comforser','conforser') THEN 'comforser'
      ELSE LOWER(TRIM(marca))
    END AS chave
  FROM public.estoque_pneus
  WHERE marca IS NOT NULL AND TRIM(marca) <> ''
)
INSERT INTO public.marcas_pneus (nome)
SELECT INITCAP(chave) FROM normalized;

UPDATE public.estoque_pneus e SET marca_id = m.id
FROM public.marcas_pneus m
WHERE LOWER(m.nome) = CASE
  WHEN LOWER(TRIM(e.marca)) IN ('sunni','sunny') THEN 'sunny'
  WHEN LOWER(TRIM(e.marca)) IN ('gallant','galant') THEN 'gallant'
  WHEN LOWER(TRIM(e.marca)) IN ('comforser','conforser') THEN 'comforser'
  ELSE LOWER(TRIM(e.marca))
END;

INSERT INTO public.estoque_pneus_compras (pneu_id, data_compra, quantidade, valor_unitario)
SELECT id, COALESCE(created_at::date, CURRENT_DATE), GREATEST(quantidade, 0), COALESCE(valor_medio_compra, 0)
FROM public.estoque_pneus;

CREATE OR REPLACE FUNCTION public.recalc_valor_medio_pneu()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pneu uuid;
  v_avg numeric;
BEGIN
  v_pneu := COALESCE(NEW.pneu_id, OLD.pneu_id);
  SELECT AVG(valor_unitario) INTO v_avg FROM (
    SELECT valor_unitario FROM public.estoque_pneus_compras
    WHERE pneu_id = v_pneu
    ORDER BY data_compra DESC, created_at DESC
    LIMIT 5
  ) s;
  UPDATE public.estoque_pneus SET valor_medio_compra = COALESCE(v_avg, 0) WHERE id = v_pneu;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_valor_medio_pneu
AFTER INSERT OR UPDATE OR DELETE ON public.estoque_pneus_compras
FOR EACH ROW EXECUTE FUNCTION public.recalc_valor_medio_pneu();
