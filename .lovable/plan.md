

## Plano: 6 melhorias (Serviços + Estoque + Pneus nos Serviços)

---

### Melhoria 01 — Botões extras na tela de Serviços

**`src/pages/Servicos.tsx`**

- Adicionar 2 botões quadrados (`size="icon"`) à esquerda dos botões existentes na barra superior:
  1. **Novo Cliente** (`UserPlus` icon) — abre dialog de cadastro de cliente (reutilizar o form de `Clientes.tsx` extraído como componente, ou abrir um dialog inline simplificado)
  2. **Refresh** (`RefreshCw` icon) — chama `fetchServicos()` + toast "Atualizado"
- Layout: `flex gap-2` com botões icon + botões com texto, responsivo para tablet

**Novo componente**: `src/components/clients/ClientDialog.tsx` — dialog reutilizável de cadastro de cliente (extraído da lógica existente em `Clientes.tsx`) para poder ser chamado de qualquer lugar.

---

### Melhoria 02 — Reformulação UI do ServiceDialog

**`src/components/services/ServiceDialog.tsx`**

- Agrupar seções com bordas e títulos visuais usando `<div className="border rounded-lg p-4">` com heading interno:
  - **Informações Gerais** (cliente/carro, datas, status)
  - **Descrição dos Serviços** (itens)
  - **Valores** (valor total, valor líquido)
  - **Custos** (fornecedores)
  - **Pagamentos** (formas de pagamento, status pagamento)
  - **Resumo** (lucro líquido, observações)
- Cada seção com `Separator` ou card visual para clara separação
- Manter responsividade (grid cols adaptáveis)

---

### Melhoria 03 — Lucro líquido no card de serviço

**`src/pages/Servicos.tsx`**

- Adicionar `lucro_liquido` à interface `Servico`
- Abaixo do `valor_total` no card, exibir lucro líquido em verde (`text-emerald-500`) com fonte menor
- Formato: `Lucro: R$ X,XX`

---

### Melhoria 04 — Abas Pneus/Acessórios no Estoque

**`src/pages/Estoque.tsx`**

- Envolver conteúdo atual em `<Tabs defaultValue="pneus">`
- Aba "Pneus": conteúdo atual
- Aba "Acessórios": placeholder com mensagem "Em breve"
- Atualizar título para "Estoque"

---

### Melhoria 05 — Cards em lista + filtro de aro + menu ações

**`src/pages/Estoque.tsx`** (aba Pneus)

- Trocar grid de cards por lista vertical (`space-y-2`, card horizontal)
- Cada card: layout flex row com medida, marca, quantidade, valores, e menu `...` (MoreHorizontal) com "Editar" e "Excluir"
- Novo filtro `Select` de Aro: opções "Todos", R13, R14, R15, R16, R17, R18, R19
- Dialog de confirmação para excluir pneu
- Remover o onClick no card inteiro (ações pelo menu)

---

### Melhoria 06 — Integrar pneus aos serviços

**Migration**: Nova tabela `servicos_pneus`

```sql
CREATE TABLE servicos_pneus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id text NOT NULL,
  pneu_id uuid NOT NULL REFERENCES estoque_pneus(id),
  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0,
  baixa_estoque boolean NOT NULL DEFAULT false
);
ALTER TABLE servicos_pneus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage servicos_pneus" ON servicos_pneus FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

**`src/components/services/ServiceDialog.tsx`**:

- Novo estado `pneus` (array de `{ pneu_id, quantidade, valor_unitario, nome_display }`)
- Botão **"+ Adicionar Pneus"** abaixo do botão "+ Adicionar" da seção Descrição dos Serviços
- Ao clicar: abre dialog popup de seleção de pneus com:
  - Lista de pneus do estoque com quantidade disponível
  - Filtros: busca por texto, filtro por marca, filtro por aro
  - Botão "Cadastrar Novo Pneu" que abre o dialog de inserir pneu do Estoque
  - Ao selecionar pneu, define quantidade e confirma
- Pneus adicionados aparecem como cards na seção com quantidade e valor unitário (do estoque)
- **Baixa no estoque**: No `handleSave`, quando `status === 'entregue'`:
  - Para cada pneu no serviço com `baixa_estoque === false`, fazer `UPDATE estoque_pneus SET quantidade = quantidade - X`
  - Marcar `baixa_estoque = true` no `servicos_pneus`
- Na edição: carregar pneus existentes do serviço
- Na exclusão do serviço: se tinha baixa, estornar estoque

**Novo componente**: `src/components/services/PneuSelectorDialog.tsx` — popup de seleção de pneus com filtros e botão de cadastro

**`src/components/services/ServiceViewDialog.tsx`**: Exibir pneus utilizados no serviço

---

### Arquivos modificados/criados

- **Nova migration**: tabela `servicos_pneus`
- **Novo**: `src/components/clients/ClientDialog.tsx`
- **Novo**: `src/components/services/PneuSelectorDialog.tsx`
- **Modificados**: `src/pages/Servicos.tsx`, `src/pages/Estoque.tsx`, `src/components/services/ServiceDialog.tsx`, `src/components/services/ServiceViewDialog.tsx`

