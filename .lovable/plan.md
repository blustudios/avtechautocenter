## Objetivo
No Financeiro › aba **Caixa**, a linha **Diferença de Caixa** deve ignorar custos de serviço cuja `data_compra` seja **posterior à data de hoje**. Esses custos ainda não impactaram o caixa real, portanto não podem entrar no "Saldo Calculado" que serve de base para a conciliação.

## Diagnóstico
Hoje o cálculo em `TabCaixa.tsx` é:

```text
saldoCalculado = saldoMêsAnterior + totalEntradas − totalSaídasPagas
diferença      = totalEmCaixa − saldoCalculado
```

`totalSaídasPagas` soma todos os lançamentos `saida` com `status_pagamento = 'pago'`, incluindo a linha automática **Custos de Serviço**, gerada em `useAutoLines` a partir de `servicos_custos` no intervalo do mês selecionado — **sem filtrar por data em relação a hoje**. Quando o usuário registra um custo com `data_compra` futura (ex.: pagamento programado), o valor é abatido do saldo calculado antes da hora, criando uma diferença artificial.

## Solução
Aplicar um corte por data atual (`today`) apenas nos **custos automáticos**, mantendo o restante da lógica intacta.

### Alterações
**Arquivo:** `src/hooks/financeiro/useFinanceiroData.ts` › função `useAutoLines`

1. Calcular `today = format(new Date(), 'yyyy-MM-dd')` dentro do `queryFn`.
2. Ajustar o filtro do `select` de `servicos_custos` para acumular somente registros com `data_compra <= today`. Duas opções equivalentes:
   - **(preferida)** Adicionar `.lte('data_compra', today)` à query já filtrada por mês — o mês futuro simplesmente não retornará custos futuros.
   - Ou manter a query como está e filtrar em memória: `custos.filter(c => c.data_compra <= today)` antes do `reduce`.
3. Nenhuma mudança na linha de **Entrada de Serviços** (pagamentos já vêm filtrados por `pago = true` + `data_pagamento` real).
4. Nenhuma mudança nos lançamentos manuais — se o usuário marcar um lançamento como "pago" com data futura, essa é uma decisão explícita dele e permanece contabilizada como hoje. (Se no futuro quisermos estender a regra a manuais, é um passo adicional — deixado fora de escopo.)

### Efeito no UI (`TabCaixa.tsx`)
Nenhuma alteração de código necessária: `useAutoLines` já é a fonte da linha `auto.saida`, e `saldoCalculado` recalcula automaticamente.

### Melhoria opcional de transparência (recomendada)
Adicionar uma nota discreta abaixo de "Saldo Calculado" quando existirem custos futuros no mês visível:

```text
Não inclui R$ X,XX em custos com data futura.
```

- Implementação: retornar de `useAutoLines` um campo extra `custosFuturos` (soma dos custos com `data_compra > today` no mês) e exibi-lo em `text-xs text-muted-foreground` apenas se `> 0`.
- Ajuda o usuário a entender por que a conciliação bate mesmo com custos já lançados no mês.

## Fora do escopo
- Filtrar lançamentos manuais futuros marcados como pagos.
- Alterar a aba Lançamentos (a linha automática de Custos continua exibindo o total mensal completo lá — ela representa o mês, não o caixa).
- Qualquer mudança em `servicos_custos` ou nas queries de Resumo/Relatórios.

## Arquivos afetados
- `src/hooks/financeiro/useFinanceiroData.ts` (ajuste em `useAutoLines`).
- `src/components/financeiro/TabCaixa.tsx` (somente se adotarmos a nota de transparência opcional).
