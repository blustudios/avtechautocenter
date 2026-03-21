

## Plano: Filtros e novos parâmetros de KPIs no Dashboard

### Resumo
Refatorar completamente o Dashboard para buscar dados de `servicos_pagamentos` (com join em `servicos`) em vez de apenas `servicos`, implementar filtros temporais com persistência via `localStorage`, e recalcular cada KPI conforme as regras especificadas.

---

### 1. Filtros de período

**UI** — Barra de filtros abaixo do título:
- Botões toggle: "Hoje", "Esta Semana", "Este Mês"
- Botão de período personalizado com 2 date pickers (data início / data fim)
- Botão "Salvar Filtro" aparece quando o filtro é alterado; salva em `localStorage('dashboard_filter')` para persistir como padrão

**Lógica de datas:**
- Hoje: `[hoje, hoje]`
- Esta Semana: `[segunda da semana atual, domingo]`
- Este Mês: `[dia 1 do mês, último dia do mês]`
- Personalizado: `[dataInício, dataFim]`

**"vs. Mês Anterior"** — Calcula o mesmo intervalo de dias deslocado 1 mês para trás.

---

### 2. Queries de dados

Buscar 3 datasets com base no período do filtro:

1. **Pagamentos do período**: `servicos_pagamentos` com `data_pagamento` entre `[start, end]` + join com `servicos` para pegar `custo_total`. Inclui campos `tipo`, `valor`, `taxa_aplicada`, `pago`.

2. **Serviços do período**: `servicos` com `data_entrada` entre `[start, end]` — para KPIs de Serviços, Ticket Médio, Média Carros/Dia, donuts de status/pagamento.

3. **Pagamentos do período anterior** (mesmo range deslocado -1 mês): para o comparativo.

---

### 3. Cálculo de cada KPI

| KPI | Fonte | Fórmula |
|-----|-------|---------|
| **Faturamento** | Pagamentos do período | `SUM(valor)` onde `tipo != 'A Definir'` |
| **Lucro Líquido** | Pagamentos do período | `SUM(valor - valor*taxa/100)` onde `tipo != 'A Definir'` (Pix CNPJ e Dinheiro têm taxa 0, então ficam sem desconto naturalmente) |
| **Serviços** | Serviços do período | `COUNT` por `data_entrada` |
| **Ticket Médio** | Serviços do período | `AVG(valor_total)` |
| **Média Carros/Dia** | Serviços do período | `COUNT / dias_no_periodo` (dias úteis seg-sáb) |
| **Média Fat./Dia** | Faturamento calculado | `Faturamento / dias_no_periodo` (total de dias, não úteis) |
| **Contas a Receber** | Pagamentos do período | `SUM(valor)` onde `pago = false` e `tipo != 'A Definir'` |
| **vs. Mês Anterior** | Pagamentos do período anterior | Mesmo cálculo de Faturamento, comparativo percentual |

**Faturamento por Dia (gráfico de barras):**
- Agrupa pagamentos por `data_pagamento`, soma `valor` (sem descontar taxas), excluindo tipo `'A Definir'`

**Donuts (Status e Pagamentos):**
- Filtram serviços por `data_entrada` dentro do período (mesmo comportamento atual, agora com filtro dinâmico)

---

### 4. Arquivo modificado

- **`src/pages/Dashboard.tsx`** — reescrita completa com:
  - Estado de filtro (`tipo` + `startDate` + `endDate`)
  - `localStorage` para salvar/carregar filtro padrão
  - Queries separadas para pagamentos e serviços
  - UI de filtros com `ToggleGroup` ou botões + date pickers
  - Cálculos reformulados conforme tabela acima

