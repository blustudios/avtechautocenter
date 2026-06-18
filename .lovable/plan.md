## Diagnóstico

O gráfico está **contabilizando entradas em dobro**. Confirmado por cálculo reverso:

- `Total Entradas` (card) = R$ 31.121,73
- Tooltip Dia 18 = R$ 11.848,22 (positivo)
- Conta correta esperada: `31.121,73 − 36.582,87 − 13.772,36 = −19.233,50`
- Conta atual observada: `(2 × 31.121,73) − 36.582,87 − 13.772,36 ≈ 11.888` ≈ 11.848,22 ✓

### Causa raiz

Em `src/components/financeiro/TabResumo.tsx`, o `useMemo` `serieDiaria` itera o array `entradas`, que **já inclui** o lançamento virtual `auto.entrada` (montado em `useAutoLines`, com `__virtual: true`, `status_pagamento: 'pago'`, `data = primeiro dia do mês` e `valor_realizado = total líquido de pagamentos do mês`).

Esse virtual entra como **toda a entrada do mês jogada no dia 1**, e logo em seguida o código soma **novamente** os mesmos pagamentos via `pagDaily` (por `data_pagamento`). Resultado: entradas dobradas, gráfico empurrado para positivo.

Para as saídas o problema **não existe** porque o loop em `saidas` já filtra `(l as any).__virtual` antes de somar. Falta a mesma proteção no loop de entradas.

Também por consistência: as "Saídas a Compensar" iteram `saidas` filtrando `__virtual` (já faz) — ok. O "pagas por dia" também filtra `__virtual` — ok.

## Mudança

Arquivo único: `src/components/financeiro/TabResumo.tsx`, dentro do `useMemo` `serieDiaria`.

No loop "Entradas manuais", pular itens virtuais (a parte automática já é coberta pelo loop seguinte de `pagDaily`):

```ts
for (const l of entradas) {
  if ((l as any).__virtual) continue;   // <-- adicionar
  const dia = dayOf(l.data);
  if (dia) entradasPorDia[dia] += Number(l.valor_realizado || 0);
}
```

Nenhuma outra alteração. Não muda KPIs nem o restante da página.

## Validação esperada após o fix (Junho/2026)

- Dia 1: passa de +R$ 13.618,39 → algo próximo de **−R$ 13.772,36** (apenas saídas a compensar, sem entradas ainda).
- Dia 18: passa de +R$ 11.848,22 → **−R$ 19.233,50** (= 31.121,73 − 36.582,87 − 13.772,36).
- O eixo Y do gráfico passará a exibir região negativa (área vermelha) e o ponto de breakeven ficará evidente quando a curva cruzar zero.
