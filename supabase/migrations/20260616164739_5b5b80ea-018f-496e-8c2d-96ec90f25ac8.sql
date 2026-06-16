
CREATE TABLE public.configuracoes_app (
  chave text PRIMARY KEY,
  valor jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_app TO authenticated;
GRANT ALL ON public.configuracoes_app TO service_role;

ALTER TABLE public.configuracoes_app ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read configuracoes"
  ON public.configuracoes_app FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert configuracoes"
  ON public.configuracoes_app FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update configuracoes"
  ON public.configuracoes_app FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.configuracoes_app (chave, valor)
VALUES ('aviso_cadastro_cliente', '{"habilitado": true, "valor_minimo": 500}'::jsonb)
ON CONFLICT (chave) DO NOTHING;
