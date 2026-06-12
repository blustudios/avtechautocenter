## Objetivo

Quatro melhorias no `src/pages/Dashboard.tsx`:

1. Corrigir **Média Carros/Dia** e **Média Fat./Dia** quando "Este Mês" estiver ativo.
2. Novo card **Previsão de Recebimentos**.
3. Ícone **?** em cada card com explicação curta da métrica.
4. Novo gráfico de **área acumulada** do faturamento do mês, com toggle on/off para sobrepor o mês anterior.

---

### 1. Correção das médias proporcionais ("Este Mês")

**Problema atual**: `totalDays` e `workDays` usam `startDate..endDate` que, para `mes`, vai do dia 1 até o fim do mês (ex.: 30/06). Hoje é 12/06 → divisor = 30 dias, subestimando a média.

**Solução**: para filtros que se estendem para o futuro (`mes`), o divisor deve considerar apenas até **hoje**.

```ts
const effectiveEnd = endDate > today ? today : endDate;
const totalDays  = differenceInCalendarDays(effectiveEnd, startDate) + 1;
const workDays   = countWorkingDays(startDate, effectiveEnd);
```

Aplica-se a `mes` (e a qualquer custom que termine no futuro). `hoje`, `ontem`, `mes_passado`, `semana` (passada) ficam corretos automaticamente.

---

### 2. Card "Previsão de Recebimentos"

Adicionar nova métrica ao grid principal:

- **Fonte**: serviços com `status = 'em_progresso'` que **não tenham nenhum registro em `servicos_pagamentos**`.
- **Valor**: soma de `valor_total` desses serviços.
- **Não é afetado pelos filtros de período** (é uma fotografia atual do que está na oficina).
- Query separada (sem date filter):
  ```ts
  supabase.from('servicos')
    .select('id, valor_total, servicos_pagamentos(id)')
    .eq('status', 'em_progresso')
  // filtrar client-side: pagamentos.length === 0
  ```
- Ícone: `Clock` ou `Hourglass`.

---

### 3. Tooltip "?" em cada card

- Estender `metrics[]` adicionando `help: string`.
- Renderizar `HelpCircle` (lucide) ao lado do label, dentro de `Tooltip`/`TooltipProvider` do shadcn (`@/components/ui/tooltip`).
- Textos curtos e didáticos, ex.:
  - Faturamento: "Soma de todos os pagamentos efetivamente recebidos no período."
  - (Faturamento) − (% Taxas): "Faturamento descontando taxas das maquininhas."
  - Lucro Líquido: "Faturamento sem taxas, menos custos dos serviços."
  - Custos dos Serviços: "Total gasto em peças e insumos no período."
  - Serviços: "Quantidade de serviços iniciados no período."
  - Ticket Médio: "Valor médio por serviço (Faturamento ÷ nº de serviços)."
  - Média Carros/Dia: "Serviços por dia útil (seg–sáb) do período."
  - Média Fat./Dia: "Faturamento dividido pelos dias do período."
  - Contas a Receber: "Pagamentos pendentes com vencimento no período."
  - Previsão de Recebimentos: "Soma do valor de serviços em progresso sem nenhum pagamento lançado."

---

### 4. Gráfico de área acumulada do mês

**Card independente** abaixo do "Faturamento por Dia", largura total (`lg:col-span-2`).

- **Independente dos filtros** do topo. Sempre considera `[startOfMonth(today), endOfMonth(today)]` e `[startOfMonth(subMonths(today,1)), endOfMonth(subMonths(today,1))]`.
- Nova query (`useQuery` com `staleTime` igual ao do dashboard), busca pagamentos `pago=true` do mês atual e do mês anterior (mesmo filtro de status que as outras queries).
- Constrói série diária com **soma acumulada**:
  ```ts
  daysOfMonth.forEach((d, i) => {
    acc += valoresDoDia[d] || 0;
    serie.push({ dia: i+1, atual: acc, anterior: accAnterior[i] });
  });
  ```
  - Mês atual: corta no dia de hoje (não projeta futuro).
  - Mês anterior: série completa do mês.
  - Eixo X: dia do mês (1..31).
- Componente `AreaChart` do recharts com dois `<Area>`:
  - `atual` em `hsl(var(--primary))`, fill com gradient ~0.4 opacidade.
  - `anterior` em cor neutra (`hsl(var(--muted-foreground))`), fill ~0.15, **render condicional** via toggle.
- Toggle: `Switch` (shadcn) + label "Comparar com mês anterior" no header do card. Default: off.
- Tooltip do recharts formatando valores como moeda.

---

### Arquivos

- **Editar**: `src/pages/Dashboard.tsx` — único arquivo afetado.
- Imports novos: `HelpCircle, Hourglass` (lucide), `Tooltip/TooltipProvider/TooltipTrigger/TooltipContent` (`@/components/ui/tooltip`), `Switch` (`@/components/ui/switch`), `AreaChart, Area, CartesianGrid` (recharts).

### Pontos a considerar:

1. **Previsão de Recebimentos**: contar apenas serviços **sem nenhum pagamento** (mesmo "A Definir" conta como pagamento).
2. **Gráfico acumulado**: a linha do mês atual deve **parar em hoje** (sem projetar).
3. **Mês com menos dias**: ao comparar Fev (28) com Mar (31), alinho por **dia do mês** (1→1, 2→2…) e ignoro dias extras.