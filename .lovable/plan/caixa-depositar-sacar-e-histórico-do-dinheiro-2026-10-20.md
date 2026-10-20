# Caixa: Depositar, Sacar e Histórico do Dinheiro

## O que muda para o usuário
- O campo **Dinheiro** passa a ser só leitura (a partir de Outubro/2026). A calculadora ao lado dele é removida (a do Stone continua).
- Abaixo dos campos, 3 botões: **Depositar**, **Sacar**, **Histórico**.
- Meses anteriores a Outubro/2026 continuam como hoje (Dinheiro editável manualmente).

### Depositar
- Popup com lista de **pagamentos em dinheiro** de serviços (marcados como pagos, ainda não depositados), mostrando ID do serviço, cliente/placa, data e valor. Clicar em um registra o depósito com aquele valor.
- Abaixo, seção **Entrada avulsa**: Valor + Descrição (obrigatória).
- Cada depósito soma no Dinheiro e vai para o Histórico. Um pagamento já depositado some da lista.

### Sacar
- Popup com Valor e Descrição (obrigatória). Deduz do Dinheiro e vai para o Histórico.

### Histórico (extrato do mês selecionado)
- Primeira linha: **Saldo do mês anterior** (saldo de Dinheiro do mês anterior).
- Depois, linhas em ordem de data: depósitos (verde, +) e saques (vermelho, −), com descrição/serviço vinculado e saldo acumulado.
- Lixeira em cada linha (com confirmação): apaga o registro, recalcula o Dinheiro; se era depósito de serviço, o pagamento volta para a lista de Depositar.

## Regra do saldo
```text
Dinheiro do mês = Saldo do mês anterior + Depósitos do mês − Saques do mês
```
- Para Outubro/2026, o "mês anterior" é o valor de Dinheiro já salvo em Setembro.
- O valor calculado é gravado no caixa do mês a cada movimento, para manter Conciliação e meses seguintes consistentes.

## Detalhes técnicos
- Nova tabela `financeiro_caixa_movimentos`: `id`, `mes_referencia` (date), `data` (date), `tipo` ('deposito' | 'saque'), `valor` numeric, `descricao` text, `servico_pagamento_id` uuid null (FK `servicos_pagamentos` ON DELETE SET NULL, UNIQUE para impedir depósito duplicado), `servico_id` text null, `created_at`. GRANTs para authenticated/service_role, RLS igual às demais tabelas financeiras.
- Constante `CAIXA_MOVIMENTOS_INICIO = '2026-10-01'` em `src/lib/financeiro/` para decidir modo legado vs. novo.
- Hook `useCaixaMovimentos(month)` + função `recalcSaldoDinheiro(mesRef)` que soma saldo anterior + movimentos e faz upsert de `saldo_dinheiro` em `financeiro_caixa` (sem tocar PJ/Stone).
- Lista de depósito: `servicos_pagamentos` com tipo dinheiro, `pago = true`, excluindo IDs já em movimentos (servicos não cancelados/orçamento).
- Novos componentes: `DepositarDialog.tsx`, `SacarDialog.tsx`, `HistoricoCaixaDialog.tsx` em `src/components/financeiro/`.
- `TabCaixa.tsx`: Dinheiro vira display só leitura no modo novo; "Salvar Caixa" salva apenas PJ e Stone nesse modo; remove calculadora do Dinheiro; invalida `['fin']` após cada movimento.
- Teste em vitest para a regra de saldo (anterior + depósitos − saques) e o corte de Outubro/2026.
