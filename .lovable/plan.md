## Plano de execução

### Objetivo
Corrigir o gráfico de área da aba **Financeiro > Resumo** para que cada ponto diário represente:

```text
Saldo do dia = Total Entradas acumuladas até o dia
             - Total Saídas acumuladas até o dia
             - Saídas a Compensar do mês
```

Sem considerar qualquer saldo vindo do mês anterior.

---

## Diagnóstico do que está diferente hoje

No arquivo `TabResumo.tsx`, o gráfico já não usa saldo anterior, porém ainda há diferenças importantes em relação ao que você pediu:

1. **O gráfico usa uma lógica própria para saídas**, chamada internamente de `pagasPorDia`, em vez de seguir diretamente o conceito visual dos cards **Total Saídas** + **Saídas a Compensar**.
2. **O gráfico exclui Retiradas** das saídas pagas e das saídas a compensar, enquanto o card **Total Saídas** hoje soma todas as saídas pelo `valor_realizado`.
3. **O gráfico exclui lançamentos virtuais automáticos** em parte da conta manual e depois soma custos de serviço separadamente. Isso é correto para distribuir por dia, mas deixa a regra menos alinhada semanticamente com “Total Saídas”.
4. **A base inicial do mês precisa ser explícita**: no dia 1, antes de entradas ou saídas pagas, o saldo deve começar negativo somente pelo total de **Saídas a Compensar** já cadastradas no mês.

---

## Melhor forma de implementar

### 1. Separar claramente os 3 componentes do gráfico
Dentro do `useMemo` de `serieDiaria`, vou deixar a conta estruturada em três blocos:

```text
entradasAcumuladasPorDia
saidasPagasAcumuladasPorDia
saidasACompensarDoMes
```

Isso deixa o cálculo rastreável e evita misturar regra de card, lançamento manual e automático.

---

### 2. Entradas acumuladas até cada dia
O gráfico deve somar por data:

- Entradas manuais cadastradas no financeiro, usando `l.data` e `valor_realizado`.
- Entradas automáticas de serviços, usando `servicos_pagamentos.data_pagamento`.
- Nas entradas automáticas, manter o líquido: `valor - taxa_aplicada`.

Resultado:

```text
Total Entradas acumuladas até dia D
```

---

### 3. Total Saídas acumuladas até cada dia
O gráfico deve somar por data:

- Saídas manuais com `status_pagamento === 'pago'`, usando a data do lançamento e `valor_realizado`.
- Custos de serviço automáticos, usando `servicos_custos.data_compra` e `valor`.

Resultado:

```text
Total Saídas pagas acumuladas até dia D
```

Essa parte representa o “Total Saídas” realizado até aquele dia.

---

### 4. Saídas a Compensar como valor fixo do mês
Vou calcular uma única vez o total de saídas ainda não pagas no mês:

```text
status_pagamento !== 'pago'
valor = valor_realizado || valor_previsto || 0
```

Esse valor entra desde o primeiro dia do mês, porque representa compromissos já cadastrados para compensar.

Exemplo esperado:

```text
Dia 1 sem entradas e sem saídas pagas:
0 - 0 - Saídas a Compensar
```

Ou seja, o gráfico começa negativo pelo valor a compensar.

---

### 5. Alinhar inclusões/exclusões com os cards do resumo
Para evitar divergência visual, vou ajustar o gráfico para seguir a mesma leitura dos cards:

- **Total Entradas**: entradas realizadas.
- **Total Saídas**: saídas realizadas/pagas.
- **Saídas a Compensar**: saídas não pagas/agendadas/a pagar.

Ponto importante: hoje o gráfico exclui **Retiradas**. Como você citou explicitamente os cards **Total Saídas** e **Saídas a Compensar**, a melhor correção é o gráfico seguir esses totais de forma consistente. Se a retirada aparece em **Total Saídas**, ela também deve impactar o gráfico; se futuramente quiser retirar lucro fora do operacional, isso deve ser uma regra separada e explícita.

---

### 6. Fórmula final diária
A série do gráfico ficará assim:

```text
accEntradas = accEntradas + entradasDoDia
accSaidasPagas = accSaidasPagas + saidasPagasDoDia
saldoDoDia = accEntradas - accSaidasPagas - saidasACompensarDoMes
```

Com separação visual atual mantida:

```text
positivo = saldoDoDia > 0 ? saldoDoDia : 0
negativo = saldoDoDia < 0 ? saldoDoDia : 0
```

---

### 7. Manter o comportamento temporal atual
Vou manter a regra já existente:

- Mês atual: desenhar somente até o dia de hoje.
- Meses anteriores: desenhar o mês inteiro.
- Dias futuros do mês atual continuam como `null`, sem projetar saldo.

---

## Arquivo a alterar

- `src/components/financeiro/TabResumo.tsx`

Alteração concentrada apenas no cálculo de `serieDiaria`, sem mexer no banco, filtros, layout ou outras abas.

---

## Resultado esperado

No gráfico de área:

- Dia 1 começa em `-Saídas a Compensar`, caso ainda não existam entradas nem saídas pagas.
- Conforme entram pagamentos/faturamento líquido, o gráfico sobe.
- Conforme saídas são pagas no dia, o gráfico desce.
- O saldo anterior do mês passado não entra na conta.
- O valor exibido passa a representar exatamente:

```text
Total Entradas acumuladas - Total Saídas acumuladas - Saídas a Compensar
```