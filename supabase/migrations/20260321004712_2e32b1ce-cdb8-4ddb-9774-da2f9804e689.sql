
CREATE TABLE marcas_carros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE
);

CREATE TABLE modelos_carros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id uuid NOT NULL REFERENCES marcas_carros(id) ON DELETE CASCADE,
  nome text NOT NULL,
  UNIQUE(marca_id, nome)
);

ALTER TABLE marcas_carros ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelos_carros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage marcas_carros" ON marcas_carros FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage modelos_carros" ON modelos_carros FOR ALL TO authenticated USING (true) WITH CHECK (true);
