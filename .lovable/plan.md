## Objetivo

Melhorar o gráfico **"Faturamento Acumulado do Mês"** no Dashboard para:

1. Comparar o mês atual com **até 3 meses passados** (selecionáveis pelo usuário).
2. Cada mês com **cor distinta** e **legenda** (mês/cor) abaixo do gráfico.
3. Três checkboxes **show/hide** para exibir **linhas tracejadas horizontais de metas**: R$ 55k, R$ 65k e R$ 75k.

Arquivo afetado: `**src/pages/Dashboard.tsx**` (único).

---

### 1. Seleção de meses comparativos (até 3)

Substituir o `Switch` "Comparar com mês anterior" por um controle de seleção múltipla:

- 3 dropdowns (`Select` shadcn) lado a lado no header do card, rotulados **"Comparar 1"**, **"Comparar 2"**, **"Comparar 3"**, cada um com opção `Nenhum` + lista dos **últimos 12 meses** anteriores ao atual (ex.: "Maio/2026", "Abril/2026", …).
- Estado: `const [compareMonths, setCompareMonths] = useState<(string|null)[]>([toMonthKey(subMonths(today,1)), null, null])` (default: mês anterior já selecionado no slot 1, para preservar comportamento atual).
- Slots não preenchidos ou repetidos são ignorados.

**Cores fixas por slot** (semânticas, dark-mode safe):

- Mês atual: `hsl(var(--primary))` (laranja)
- Slot 1: `hsl(217 91% 60%)` (azul)
- Slot 2: `hsl(280 70% 60%)` (roxo)
- Slot 3: `hsl(160 70% 45%)` (verde-água)

---

### 2. Query e série de dados

Refatorar `useQuery` `dashboard-cumulative` para buscar **N+1 meses** dinamicamente:

```ts
const monthsToFetch = [today, ...compareMonths.filter(Boolean).map(parseMonthKey)];
// Promise.all sobre cada mês -> Record<monthKey, rows[]>
```

`cumulativeSeries` passa a produzir objetos com chaves dinâmicas por mês:

```ts
{ dia: 1, atual: 1200, '2026-05': 980, '2026-04': 1500 }
```

Regras mantidas:

- Mês atual corta em `todayDay` (não projeta).
- Meses passados sempre completos.
- Alinhamento por dia do mês (1→1, 2→2…); dias extras (ex.: 31 em fev) ficam `null`.
- Eixo X = 1..max(diasDosMesesSelecionados).

---

### 3. Renderização do `AreaChart`

- Renderizar um `<Area>` para o mês atual + um para cada slot ativo, usando a cor correspondente, `strokeWidth=2`, `fill=url(#fillX)` com `opacity` ~0.25 para passados e ~0.4 para o atual.
- Gradients definidos dinamicamente em `<defs>` (um `linearGradient` por mês selecionado).
- `connectNulls` ativo.

**Legenda customizada** (abaixo do gráfico, dentro do card):

- Lista horizontal de chips: `[bolinha colorida] Junho/2026 (Atual)`, `Maio/2026`, etc.
- Renderizada manualmente (não o `<Legend>` do recharts) para controle visual e consistência com o resto do app.

---

### 4. Metas (linhas tracejadas)

Acima ou ao lado dos seletores de mês, adicionar 3 `Checkbox` shadcn:

```
[ ] Meta R$ 55k   [ ] Meta R$ 65k   [ ] Meta R$ 75k
```

Estado: `const [goals, setGoals] = useState({ g55: false, g65: false, g75: false })`.

Para cada meta ativa, adicionar um `<ReferenceLine y={55000} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 4" label={{ value: 'R$ 55k', position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />` (importar `ReferenceLine` do recharts).

Cores das metas: tom neutro (`muted-foreground`) com variações sutis de opacidade, ou uma cor única para todas — manter discreto para não competir com as séries.

---

### 5. Tooltip

Atualizar `formatter` do `RTooltip` para iterar dinamicamente sobre as séries presentes, exibindo `[cor] Mês X: R$ valor` para cada mês ativo no ponto.

---

### Detalhes técnicos

- Novo helper `toMonthKey(date)` → `'YYYY-MM'` e `parseMonthKey(key)` → `Date` (1º dia do mês).
- Novo helper `formatMonthLabel(date)` → `'Maio/2026'` (usar `format` do `date-fns` com locale `ptBR`).
- Imports adicionais: `ReferenceLine` (recharts), `Checkbox` (`@/components/ui/checkbox`), `Select*` (`@/components/ui/select`), `ptBR` (`date-fns/locale`).
- Remover: `Switch` daquele card (mantido se usado em outro lugar — verificar; provavelmente exclusivo).
- `staleTime`: manter 2 min.

---

### Pontos a considerar:

1. **Default ao abrir**: slot 1 = mês anterior já selecionado, slots 2 e 3 vazios.
2. **Lista de meses no dropdown**: últimos 12 meses anteriores ao atual.
3. **Metas**: valores fixos R$ 55k / 65k / 75k (não editáveis).