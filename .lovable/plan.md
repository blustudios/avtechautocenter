

## Plano: Autocomplete de Marcas e Modelos de Carros

### Resumo
Criar um cadastro de marcas e modelos de carros em Configurações, com importação via XML, e usar autocomplete nos campos de marca/modelo em todo o sistema.

### 1. Banco de dados — 2 novas tabelas

```sql
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
```

### 2. Componente Autocomplete — `src/components/ui/autocomplete-input.tsx`
- Input com dropdown de sugestões filtradas conforme digitação
- Props: `value`, `onChange`, `suggestions: string[]`, `placeholder`
- Filtra case-insensitive, mostra até 8 sugestões
- Click ou Enter seleciona a sugestão e preenche o campo
- Se o usuário digitar algo que não está na lista, o valor livre é aceito normalmente

### 3. Configurações — Nova seção "Marcas e Modelos" (`Configuracoes.tsx`)
- Nova aba/seção abaixo de Maquininhas
- Lista de marcas com expand para ver modelos
- CRUD inline: adicionar/remover marcas, adicionar/remover modelos dentro de cada marca
- **Botão "Importar XML"**: abre dialog com file input
- **Ícone "?" (tooltip/popover)** com tutorial do formato XML:
  ```xml
  <marcas>
    <marca nome="Fiat">
      <modelo>Uno</modelo>
      <modelo>Palio</modelo>
    </marca>
    <marca nome="Volkswagen">
      <modelo>Gol</modelo>
      <modelo>Polo</modelo>
    </marca>
  </marcas>
  ```
- Ao importar: parsear XML, para cada marca verificar se já existe (by nome case-insensitive), se não → inserir. Para cada modelo, verificar se já existe na marca → só inserir novos. Toast com resumo ("X marcas e Y modelos adicionados").

### 4. Uso do autocomplete nos formulários existentes

- **`Clientes.tsx`** (campos de carro inline): substituir `<Input>` de marca e modelo por `<AutocompleteInput>`. Ao selecionar marca, filtrar modelos daquela marca para o campo modelo.
- **`ServiceDialog.tsx`** (quickCar): mesma lógica — autocomplete de marca, e modelo filtrado pela marca selecionada.

### 5. Fluxo de dados
- Ao abrir qualquer formulário com carro, carregar `marcas_carros` com `modelos_carros` uma vez
- Passa array de nomes de marcas para o autocomplete de marca
- Quando marca muda, filtra modelos correspondentes e passa para autocomplete de modelo

### Arquivos
- **Nova migration**: tabelas `marcas_carros` e `modelos_carros`
- **Novo**: `src/components/ui/autocomplete-input.tsx`
- **Modificados**: `src/pages/Configuracoes.tsx` (seção de marcas/modelos + importação XML), `src/pages/Clientes.tsx` (autocomplete nos carros), `src/components/services/ServiceDialog.tsx` (autocomplete no quickCar)

