## Objetivo

No `src/pages/Dashboard.tsx`:

1. Adicionar dois novos filtros rápidos: **Ontem** e **Mês Passado**.
2. Quando o filtro **Este Mês** estiver ativo, a comparação "vs. Período Anterior" deve usar o mês anterior **até o mesmo dia** do mês atual — não o mês passado inteiro.

## Mudanças

### 1. Novos filtros rápidos

Adicionar na lista `filterButtons` (e no tipo `FilterType`):

- `ontem` → intervalo: `[subDays(today, 1), subDays(today, 1)]`
- `mes_passado` → intervalo: `[startOfMonth(subMonths(today,1)), endOfMonth(subMonths(today,1))]`

Atualizar `FilterType` para incluir `'ontem' | 'mes_passado'` e estender o `switch` em `getDateRange`.

Layout: os botões entram na mesma linha dos filtros atuais, na ordem: **Hoje · Ontem · Esta Semana · Este Mês · Mês Passado · Personalizado**.

### 2. Período anterior proporcional ("Este Mês")

Hoje `getPrevRange` apenas subtrai 1 mês do `start` e do `end`. Isso faz com que, ao escolher "Este Mês" no dia 10, comparemos com o mês passado inteiro (1–30/31), inflando o comparativo.

Nova regra para o cálculo do período anterior:

- `**mes` (Este Mês)**: anterior = `[startOfMonth(subMonths(today,1)), subMonths(today, 1)]` — ou seja, do dia 1 do mês passado até o "mesmo dia" do mês passado (hoje − 1 mês). Se hoje é 12/06, anterior = 12/05 a 12/05? Não: **01/05 a 12/05**. Isso reflete "mês passado até hoje".
- `**hoje**`: anterior = ontem (`[subDays(today,1), subDays(today,1)]`).
- `**ontem**`: anterior = anteontem.
- `**semana**`: anterior = semana passada inteira (mesma lógica atual: subtrair 7 dias do start/end).
- `**mes_passado**`: anterior = mês retrasado inteiro (`startOfMonth(subMonths(today,2))` a `endOfMonth(subMonths(today,2))`).
- `**custom**`: anterior = mesma duração imediatamente antes do `start` (mantém comportamento previsível).

Refatorar `getPrevRange` para receber `(filterType, start, end)` e aplicar a regra acima.

### 3. Impacto nas métricas

Tudo que depende de `prevStart`/`prevEnd` já é recalculado automaticamente via `useMemo` e `useQuery` (keys `ps`/`pe`). O único KPI que usa explicitamente o período anterior é **"vs. Período Anterior"** (`prevFat`, `fatChange`) — esse passará a refletir o comparativo proporcional corretamente.

A label exibida abaixo do delta (`Anterior (dd/MM - dd/MM)`) continuará dinâmica e mostrará o novo intervalo (ex.: `01/05 - 12/05`), deixando claro ao usuário o que está sendo comparado.

### 4. Persistência

O `localStorage` (`dashboard_filter`) já guarda `type` como string — apenas aceitará os novos valores. Nenhuma migração necessária.

## Arquivos

- **Editar**: `src/pages/Dashboard.tsx` (único arquivo afetado).

## Pontos a confirmar

1. Para **Este Mês**, confirmo: anterior = **dia 1 do mês passado até "hoje − 1 mês"** (ex.: hoje 12/06 → 01/05–12/05). OK? Sim
2. Para **Mês Passado**, comparar com o mês retrasado inteiro faz sentido para você? Sim
3. Para **Custom**, manter "mesma duração imediatamente antes do início" (em vez de subtrair 1 mês como hoje)? Sim