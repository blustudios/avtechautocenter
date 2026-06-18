## Ajuste do cálculo do gráfico de área (Lucro Líquido Real diário)

### O que está diferente hoje

No código atual (`serieDiaria` em `TabResumo.tsx`), a fórmula é:

```
saldo(D) = accEntradas(D) − previstoRestante(D) − accPagas(D)
onde previstoRestante(D) = previstoMesTotal − accPrevPago(D)
```

Ou seja: quando uma saída prevista é paga, ela **sai** do "previsto" e **entra** em `accPagas`. O lado das saídas fica praticamente estável no mês (o previsto vai virando pago).

**O que você quer:** as saídas **não** devem "trocar de balde". O baseline é a soma de TODAS as saídas com status `a_pagar` ou `agendado` do mês (fixo), e além disso somam-se as saídas pagas conforme o dia em que foram pagas.

### Nova fórmula

Para cada dia D do mês:

```
saldo(D) = accEntradas(D) − ( saidasACompensarTotal + accPagas(D) )
```

- `accEntradas(D)`: soma acumulada (do dia 1 ao dia D) das entradas:
  - Entradas manuais → `valor_realizado` no `l.data`.
  - Entradas automáticas → para cada `servicos_pagamentos` com `pago=true` no mês, soma `valor − (valor × taxa_aplicada / 100)` na `data_pagamento`.
- `saidasACompensarTotal` (constante para o mês, igual ao KPI já exibido):
  - Soma de TODAS as saídas manuais operacionais do mês com `status_pagamento` **≠** `pago` (ou seja, `a_pagar` ou `agendado`).
  - Valor usado: `valor_realizado || valor_previsto || 0` (consistente com o KPI).
  - **Exclui** Retiradas (`categoria_id === catRetiradas.id`) e linhas virtuais (`__virtual`).
- `accPagas(D)`: soma acumulada das saídas efetivamente pagas até o dia D:
  - Saídas manuais operacionais com `status_pagamento === 'pago'` → `valor_realizado` no `l.data` (exclui Retiradas e virtuais).
  - Custos de serviço (`servicos_custos.data_compra`) → tratados como pagos no dia da compra.

### Comportamento esperado

- **Dia 1 (antes de qualquer movimentação):** `accEntradas = 0`, `accPagas = 0`, então `saldo(1) = −saidasACompensarTotal` (negativo, área vermelha).
- À medida que entradas líquidas entram, a área sobe; à medida que saídas são pagas, desce mais (o "a compensar" não diminui, pois reflete apenas os que ainda não foram pagos no momento da renderização).
- A curva projeta `null` para os dias após o dia atual (mantém o comportamento já implementado).

### Mudanças técnicas em `TabResumo.tsx`

1. Remover os arrays `previstoPagoPorDia` e o acumulador `accPrevPago`.
2. Substituir o cálculo do `previstoMesTotal` por `saidasACompensarTotalChart`:
   - Itera `saidas`, ignora Retiradas e `__virtual`, e soma apenas os com `status_pagamento !== 'pago'`, usando `Number(l.valor_realizado) || Number(l.valor_previsto) || 0`.
3. O loop diário passa a calcular: `valor = accEntradas − (saidasACompensarTotalChart + accPagas)`.
4. Mantidos: `pagasPorDia` (manuais pagas + `custosDaily`), `entradasPorDia` (manuais + pagamentos líquidos), corte da curva no dia atual.

### Arquivo afetado

- `src/components/financeiro/TabResumo.tsx` (apenas o `useMemo` `serieDiaria`).
