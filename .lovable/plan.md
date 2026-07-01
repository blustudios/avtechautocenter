## Objetivo
Exibir no card de cada pneu (Estoque › Pneus) três indicadores financeiros e reintroduzir o campo **Preço sugerido de venda** no cadastro/edição do pneu, com preenchimento automático desse valor no diálogo "Incluir Pneu" dentro de um serviço.

## Escopo

### 1. Banco de dados
O campo `estoque_pneus.valor_venda` (numeric, default 0) **já existe** — nenhuma migração necessária.

### 2. Card do Pneu (`src/pages/Estoque.tsx` › `PneuCard`)
Adicionar, entre a área de identificação e os botões de ação, um bloco compacto de indicadores alinhado à direita (visível em ≥ sm, colapsando em pilha em telas menores):

```text
Compra méd.     Venda sug.     Lucro
R$ 320,00       R$ 480,00      +R$ 160,00
```

- **Compra méd.** — `valor_medio_compra` (cinza/muted).
- **Venda sug.** — `valor_venda` (foreground). Se `0`, mostrar `—` em muted.
- **Lucro previsto** — `valor_venda − valor_medio_compra`. Verde se > 0, vermelho se < 0, muted se venda for 0. Formato `+R$ x,xx` / `−R$ x,xx`.

Labels em `text-[10px] uppercase text-muted-foreground`, valores em `text-sm font-semibold`, separados por um `Separator` vertical do bloco de botões. Em mobile o bloco financeiro vira uma linha secundária abaixo da identificação.

Atualizar a interface `Pneu` incluindo `valor_venda: number` e popular no `fetchAll`.

### 3. Cadastro e Edição do Pneu
- **`CadastroPneuDialog`**: adicionar campo `Preço sugerido de venda` (usando `CurrencyInput`) logo abaixo de `Valor unitário`. Persistir em `valor_venda` no `insert` (removendo o `valor_venda: 0` hardcoded).
- **`EditPneuDialog`**: adicionar o mesmo campo, inicializado com `pneu.valor_venda`, e incluir na atualização.

### 4. Auto-preenchimento no Serviço (`src/components/services/PneuSelectorDialog.tsx`)
- Incluir `valor_venda` no `select` de `estoque_pneus`.
- Em `openSelection(p)`, definir `setValorUnit(String(Number(p.valor_venda) || Number(p.valor_medio_compra) || 0))` — usa a venda sugerida quando disponível, caindo para o valor médio de compra como fallback.
- Renderizar uma pequena legenda abaixo do campo "Valor unitário": `Sugerido: R$ x,xx` (clicável para redefinir), quando `valor_venda > 0`.

## Detalhes técnicos
- Nenhuma alteração em `ServiceDialog.tsx` além do já fluxo — o valor já é entregue pronto pelo `PneuSelectorDialog`.
- Formatação via `formatCurrency` de `src/lib/format.ts`.
- Manter comportamento existente do botão "Adicionar" (verde) e ícones (Histórico · Editar · Excluir).

## Fora do escopo
- Cálculo de margem em %, histórico de mudanças de preço, ou regras automáticas de reajuste.
- Alterações na aba Acessórios.

## Arquivos afetados
- `src/pages/Estoque.tsx` (PneuCard, CadastroPneuDialog, EditPneuDialog, interface Pneu, fetchAll).
- `src/components/services/PneuSelectorDialog.tsx`.
