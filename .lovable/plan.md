

## Plano: Melhorias em Filtros, Cards, Resumo, Custos e Dashboard

### Resumo
7 alterações distribuídas entre Serviços (filtros, cards, resumo), ServiceDialog (data de compra nos custos), e Dashboard (KPI de custos baseado na nova data).

---

### 1. Migration — campo `data_compra` em `servicos_custos`

```sql
ALTER TABLE servicos_custos ADD COLUMN data_compra date;
-- Preencher custos existentes com a data_entrada do serviço correspondente
UPDATE servicos_custos sc SET data_compra = s.data_entrada FROM servicos s WHERE sc.servico_id = s.id;
ALTER TABLE servicos_custos ALTER COLUMN data_compra SET DEFAULT CURRENT_DATE;
```

---

### 2. `src/pages/Servicos.tsx` — Filtros de período

**Novos presets**: Substituir `'all' | '3days' | '7days' | 'custom'` por `'mes' | 'semana' | 'ontem' | 'hoje' | 'custom'`. Default: `'mes'`.

**Lógica de datas**:
- `mes`: `[startOfMonth(today), endOfMonth(today)]`
- `semana`: `[startOfWeek(today, {weekStartsOn:1}), endOfWeek(today, {weekStartsOn:1})]`
- `ontem`: `[yesterday, yesterday]`
- `hoje`: `[today, today]`
- `custom`: Se apenas `dateFrom`, filtra data exata. Se ambos, filtra range.

**Filtro Avançado — tipo de forma de pagamento**: Adicionar `paymentTypeFilter` (default `'all'`). Select com opções: "Todos", + cada item de `tiposPagamento`. Filtra serviços que possuem ao menos 1 pagamento com o tipo selecionado.

---

### 3. `src/pages/Servicos.tsx` — Cards de serviço

Adicionar `custo_total` à interface `Servico` e ao select.

No card, entre valor total e lucro:
```
R$ 500,00          (valor total - texto grande)
Custo: R$ 120,00   (text-xs text-destructive)
Lucro: R$ 380,00   (text-xs text-emerald-500)
```

---

### 4. `src/pages/Servicos.tsx` — Seção "Resumo" colapsável

Após todos os filtros e antes da lista, adicionar `Collapsible` "Resumo" (fechado por padrão):
- **Valor Total**: `sorted.reduce(sum + valor_total)`
- **Custos**: `sorted.reduce(sum + custo_total)`
- **Lucro**: `sorted.reduce(sum + lucro_liquido)`

Exibidos em 3 cards inline horizontais com cores (neutro, vermelho, verde).

---

### 5. `src/components/services/ServiceDialog.tsx` — Data de compra nos custos

Adicionar campo `data_compra` ao estado de custos (default: `form.data_entrada`).

Na UI de cada custo, adicionar `<Input type="date">` para data de compra.

No `handleSave`, incluir `data_compra` no insert de `servicos_custos`.

Na edição, carregar `data_compra` dos registros existentes.

---

### 6. `src/pages/Dashboard.tsx` — KPI Custos baseado em `data_compra`

Alterar a query de custos: em vez de somar `custo_total` dos serviços, buscar diretamente de `servicos_custos` filtrando por `data_compra` dentro do período.

Nova query adicional:
```ts
supabase.from('servicos_custos').select('valor, quantidade, data_compra')
  .gte('data_compra', s).lte('data_compra', e)
```

Recalcular:
- `custoTotal = custos.reduce(sum + valor * quantidade)`
- `lucroLiquidoReal = lucroLiquido - custoTotal`

---

### Arquivos modificados/criados
- **Nova migration**: `data_compra` em `servicos_custos`
- **`src/pages/Servicos.tsx`**: filtros, cards, resumo
- **`src/components/services/ServiceDialog.tsx`**: data de compra nos custos
- **`src/pages/Dashboard.tsx`**: query de custos por `data_compra`

