## Objetivo
No card **"Pneus vendidos no mês"** (aba Estoque de Pneus em Financeiro), exibir, além do total, um breakdown por **tipo de pneu** (Remold, Importado, 1ª Linha). Tipos sem vendas no mês são ocultados.

## 1. Hook `useVendasPneusMes` (`src/hooks/financeiro/useEstoquePneusData.ts`)
- Ampliar o `select` para incluir o `tipo` do pneu vendido:  
  `.select('quantidade, estoque_pneus!inner(tipo), servicos!inner(status, data_entrada, data_encerramento)')`
- Durante a agregação já existente, acumular também `porTipo: Record<string, number>` (chaves: `Remold`, `Importado`, `1ª Linha`).
- Retornar `{ totalMes, porDia, porTipo }`.

## 2. Card KPI (`src/components/financeiro/TabEstoquePneus.tsx`)
Substituir o `Kpi` simples de "Pneus vendidos no mês" por uma variante que aceita `breakdown`:

```
┌─────────────────────────────────────┐
│ [↘]  PNEUS VENDIDOS NO MÊS          │
│      42                             │
│      ─────────────────────────      │
│      Remold 20 · Importado 15 · 1ª Linha 7 │
└─────────────────────────────────────┘
```

- Cada tipo aparece como uma "pílula" (`Badge` variant `secondary` ou div com `bg-muted`), com rótulo pequeno e número em destaque.
- Ocultar a pílula quando a quantidade for `0`/ausente.
- Se `totalMes === 0`, não renderizar a linha de breakdown (mantém só o `0` grande).
- Layout responsivo: pílulas em `flex flex-wrap gap-1.5 mt-2`, tipografia `text-xs`, quantidade em `font-semibold text-foreground` e rótulo em `text-muted-foreground`.
- Cor sutil de acento por tipo (opcional, usando tokens):
  - Remold → `text-amber-400`
  - Importado → `text-sky-400`
  - 1ª Linha → `text-emerald-400`

## 3. Detalhes técnicos
- Nenhuma migração necessária — `estoque_pneus.tipo` já existe.
- Ordenação fixa: Remold, Importado, 1ª Linha (mesma ordem do cadastro).
- Manter skeleton loader quando `vendas.isLoading`.

## Arquivos a editar
- `src/hooks/financeiro/useEstoquePneusData.ts`
- `src/components/financeiro/TabEstoquePneus.tsx`

## Fora do escopo
- Filtros por tipo no gráfico diário.
- Novos KPIs de valor por tipo.
