## Objetivo

Corrigir a fórmula do gráfico de área "Lucro Líquido Real" na aba **Resumo** do Financeiro para evitar duplicação de valores e refletir exatamente o comportamento solicitado.

## Fórmula final (por dia D)

```
saldo(D) = entradasAcumuladas(D) − previstoRestante(D) − pagasAcumuladas(D)
```

Onde:

- **entradasAcumuladas(D)** = Σ (Faturamento − Taxa) de pagamentos com `data_pagamento ≤ D` + entradas manuais pagas com `data ≤ D`.
- **previstoRestante(D)** = Σ `valor_previsto` das saídas operacionais do mês **menos** os previstos das saídas que já foram pagas até o dia D (assim, quando uma prevista vira paga, ela some do previsto e aparece como paga — sem duplicar).
- **pagasAcumuladas(D)** = Σ saídas operacionais pagas com data ≤ D + custos de serviço (`servicos_custos.data_compra`) ≤ D.
- "Operacionais" exclui a categoria sistema **Retiradas**.
- Não há herança de saldo do mês anterior. O gráfico só vai até hoje (se mês atual) ou até o último dia do mês (meses passados).

## Como cada decisão se aplica

- **Entradas:** acumuladas desde o dia 1 (líquidas, já descontando taxa de maquininha).
- **Previsto vs Pago:** quando o lançamento previsto é pago, seu `valor_previsto` é descontado do bloco de previsto naquele dia em diante — eliminando a duplicação que existe hoje.
- **Custos de serviço:** entram apenas como "saída paga do dia" (na `data_compra`). Eles **não** somam no previsto do mês. A entrada virtual de saída automática (custos agregados) deixa de ser usada nesse cálculo.

## Mudanças no código (`src/components/financeiro/TabResumo.tsx`)

Reescrever apenas o `useMemo` `serieDiaria` (linhas 86–146):

1. Construir `entradasPorDia[]` (mesma lógica atual: manuais com `tipo='entrada'` por `l.data` + `pagDaily` líquidos por `data_pagamento`).
2. Construir `pagasPorDia[]`:
  - Saídas manuais (não-Retiradas) com `status_pagamento='pago'` por `l.data` usando `valor_realizado`, ignorando a saída automática virtual (`__virtual`).
  - `custosDaily` por `data_compra` usando `valor`.
3. Construir `previstoPorDiaPago[]` (novo): para cada saída manual operacional com `status_pagamento='pago'`, somar `valor_previsto` no dia `l.data`. Isso representa quanto do previsto "saiu da fila" naquele dia.
4. `previstoMesTotal` = Σ `valor_previsto` das saídas manuais operacionais (não inclui custos automáticos).
5. Loop por dia `d` de 1 até `lastDay`:
  - `accEntradas += entradasPorDia[d]`
  - `accPagas    += pagasPorDia[d]`
  - `accPrevPago += previstoPorDiaPago[d]`
  - `previstoRestante = previstoMesTotal − accPrevPago`
  - `valor = accEntradas − previstoRestante − accPagas`
  - empurrar `{ dia: d, acumulado: valor, positivo: max(valor,0), negativo: min(valor,0) }`

## Detalhes técnicos

- Remover a saída automática virtual do cálculo do gráfico (já filtrada via `__virtual`). Os custos vêm exclusivamente de `custosDaily`.
- Saídas com `valor_previsto = 0` (ex.: lançamentos ad-hoc) não afetam `previstoMesTotal` nem `previstoPorDiaPago`, mas continuam aparecendo em `pagasPorDia` quando pagas — comportamento desejado.
- Tooltip/eixos/áreas verde/vermelha permanecem iguais.
- Nenhuma alteração de schema, hook ou outro arquivo.

## Validação

- Dia 1 sem entradas/pagamentos → `valor = 0 − previstoMesTotal − 0` (negativo, como você descreveu).
- Ao pagar uma saída prevista de R$ X no dia D: `previstoRestante` cai X e `accPagas` sobe X → impacto líquido **zero** (sem duplicação).
- Ao pagar uma saída sem previsto (ad-hoc/custo de serviço): só `accPagas` sobe → saldo cai naquele valor.
- Ao receber entrada líquida no dia D: `accEntradas` sobe → saldo melhora.

&nbsp;

## Design do gráfico

- gráfico não projeto dia atual até o fim do mês, porém mostra todos os dias do mês para dar noção de tempo restante.