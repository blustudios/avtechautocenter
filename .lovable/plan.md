## Plano

### 1. Botão "Mês Passado" no filtro de período (Serviços)

`src/pages/Servicos.tsx`:
- Adicionar `'mes_passado'` ao tipo `DatePreset`.
- Em `getDateRange`, retornar `{ from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) }` quando `datePreset === 'mes_passado'`.
- Adicionar `{ label: 'Mês Passado', value: 'mes_passado' }` no array `filterButtons` (logo após "Este Mês").

### 2. Bug — Dashboard contabilizando pagamentos pendentes

Causa: as queries de `servicos_pagamentos` no Dashboard filtram por `data_pagamento` no intervalo, mas **não filtram por `pago = true`**. Pagamentos com data preenchida mas ainda não marcados como pagos entram em Faturamento, Faturamento − Taxas e no gráfico de Faturamento por Dia.

Correção em `src/pages/Dashboard.tsx`:
- Nas duas queries de `servicos_pagamentos` (período atual `pRes` e anterior `ppRes`), adicionar `.eq('pago', true)`.
- Manter o cálculo de **Contas a Receber** correto: como agora `pagamentos` só traz pagos, fazer uma **query separada adicional** para contas a receber buscando pagamentos `pago = false` com `data_pagamento` no período (ou sem filtro de data, conforme regra atual de "a receber"). Proposta: buscar pagamentos não pagos cujo `data_pagamento` esteja entre `s` e `e` e `tipo != 'A Definir'`.
- Ajustar `contasReceber` para usar essa nova lista em vez de filtrar `validPagamentos.filter(p => !p.pago)` (que agora sempre será vazio).
- O gráfico `barData` e os KPIs Faturamento/Faturamento−Taxas passam a refletir apenas pagamentos efetivamente recebidos.

### Arquivos modificados
- `src/pages/Servicos.tsx` — novo preset "Mês Passado".
- `src/pages/Dashboard.tsx` — filtrar `pago = true` no faturamento e isolar query de contas a receber.
