# Plano: Módulo "Controle Financeiro"

Implementação de um novo módulo completo para gestão financeira, integrado aos Serviços existentes. Tema dark atual mantido (charcoal #1A1A1A, laranja #F97316).

## Visão geral da entrega

Um único módulo `/financeiro` com 3 abas (Lançamentos, Resumo, Caixa), seletor de mês global, central de notificações, integração read-only com `servicos_pagamentos` e `servicos_custos`, e uma nova seção em Configurações para gerenciar Categorias e Origens.

---

## 1. Banco de Dados (Supabase)

Migration única criando 5 tabelas + seeds. Todas com RLS `authenticated`, GRANTs apropriados (`authenticated` + `service_role`), e padrão do projeto.

**Tabelas:**

- `financeiro_categorias` — categorias de saída. Coluna extra `is_system boolean` (para "Custos de Serviço" e "Retiradas", não renomeáveis/deletáveis).
- `financeiro_origens` — origens (entrada/saída). Mesma flag `is_system` para "Entrada de Serviços".
- `financeiro_recorrencias` — frequência, data início/fim.
- `financeiro_lancamentos` — lançamentos manuais. Auto lines (`is_auto=true`) **não persistidas** — computadas em runtime via query agregada (regra Parte 4: "Do not store a frozen copy"). Mantenho a coluna `is_auto` no schema apenas por compatibilidade futura; nenhuma linha gravada terá `is_auto=true`.
- `financeiro_caixa` — saldos mensais (UNIQUE em `mes_referencia`).

**Seeds:** as 12 categorias default + "Custos de Serviço" e "Retiradas" como `is_system=true`. As 5 origens default + flag `is_system` na "Entrada de Serviços".

**Constraints adicionais:** CHECK em `tipo IN ('entrada','saida')`, `status_pagamento IN ('a_pagar','agendado','pago')`, `frequencia IN ('semanal','mensal','anual')`.

---

## 2. Estrutura de Arquivos

```text
src/pages/Financeiro.tsx                    (shell com tabs + mês global)
src/pages/financeiro/
  TabLancamentos.tsx
  TabResumo.tsx
  TabCaixa.tsx
src/components/financeiro/
  MonthSelector.tsx                         (Junho 2026 + setas)
  LancamentoEntradaDialog.tsx
  LancamentoSaidaDialog.tsx                 (com bloco de recorrência)
  DeleteRecurrenceDialog.tsx                (popup Parte 7)
  LancamentosGroupedList.tsx                (Entradas / Saídas > Categoria)
  StatusPagamentoBadge.tsx
  NotificationsBell.tsx                     (sino + dropdown)
  ResumoKPIs.tsx
  PrevistoRealizadoTable.tsx
  ResumoCharts.tsx                          (Recharts: donut + bar)
src/pages/configuracoes/Financeiro.tsx      (categorias + origens)
src/hooks/financeiro/
  useMonthContext.tsx                       (Context do mês selecionado)
  useLancamentos.ts                         (manuais + auto computadas, merge)
  useAutoLines.ts                           (agrega servicos_pagamentos/custos)
  useCaixa.ts
  useResumo.ts
  useNotificacoes.ts
  useCategorias.ts / useOrigens.ts / useRecorrencias.ts
src/lib/financeiro/
  calculations.ts                           (somas, desvios, saldo calculado)
  recurrence.ts                             (expansão de datas semanal/mensal/anual)
```

Rota nova em `src/App.tsx`: `/financeiro`. Item de menu em `src/components/AppSidebar.tsx` entre Estoque e Dashboard (ícone `Wallet`).

---

## 3. Lógica das Auto Lines (Parte 4)

Computadas no client por React Query, **não gravadas**:

- **Entrada de Serviços:** SELECT em `servicos_pagamentos` JOIN `servicos` onde `pago=true`, `data_pagamento` no mês, `servicos.status IN ('em_progresso','finalizado')`. Valor = `SUM(valor - valor*taxa_aplicada/100)` (líquido).
- **Custos de Serviço:** SELECT em `servicos_custos` JOIN `servicos` onde `data_compra` no mês e mesmo filtro de status. Valor = `SUM(valor)`.

São injetadas como itens virtuais no grupo Entradas e na subcategoria "Custos de Serviço" do grupo Saídas, com ícone de cadeado, sem menu de edição, tooltip "Atualizado automaticamente pelos Serviços".

---

## 4. Aba Lançamentos (Parte 3)

- Lista agrupada em 2 níveis (Entradas, Saídas > Categoria) com totais à direita.
- Cada linha: data, descrição, origem, badge status (saídas), `valor_realizado` (principal) + `valor_previsto` (muted).
- Menu `...` com Editar / Excluir (escondido para auto).
- Filtros: Categoria, Status, Origem, busca por descrição.
- Botões `+ Nova Entrada` (verde) e `+ Nova Saída` (laranja).

**Form Nova Saída (Parte 5):** com bloco de recorrência (frequência + data fim). Ao salvar com recorrência: cria 1 row em `financeiro_recorrencias` e N rows em `financeiro_lancamentos` (expandidas no client com helper `recurrence.ts`), todas compartilhando o `recorrencia_id`, cada uma com `mes_referencia` correto, status `a_pagar`, `valor_realizado=0`. Helper text sobre não duplicar custos de serviço.

**Form Nova Entrada (Parte 6):** simples; origem filtrada por `tipo='entrada'` excluindo `is_system`.

**Exclusão recorrente (Parte 7):** dialog com radio "Somente este" / "Este e todos os seguintes" (DELETE WHERE `recorrencia_id=$1 AND data >= $2`).

---

## 5. Aba Caixa (Parte 8)

- 3 inputs monetários (Conta PJ Inter, Dinheiro, Stone) com upsert por `mes_referencia`.
- "Saldo do mês anterior" (read-only, lê o `Total em Caixa` do mês anterior).
- "Total em Caixa" (soma dos 3).
- "Saldo Calculado" = Saldo anterior + Entradas realizadas − Saídas realizadas (status `pago`) do mês (inclui auto lines).
- "Diferença de Caixa" = Total − Calculado (verde se 0, vermelho caso contrário).

---

## 6. Aba Resumo (Parte 9)

KPIs:

1. Lucro Líquido Real = Entradas realizadas − Saídas realizadas (todas), **excluindo categoria Retiradas**.
2. Saídas a Compensar (não pagas, usa realizado ou previsto se realizado=0).
3. Total Entradas realizado.
4. Total Saídas realizado.

**Tabela Previsto vs Realizado** por categoria com Desvio (R$ e %), indicador verde/vermelho.

**Charts (Recharts já no projeto):**

- Donut: saídas realizadas por categoria.
- Bar agrupada: Previsto vs Realizado por categoria.

**Card separado "Retiradas de Lucro"** com total da categoria Retiradas.

---

## 7. Notificações (Parte 10)

Sino no topo do módulo com badge (overdue + upcoming). Dropdown lista:

- Vencido (vermelho): saídas com `data < hoje` e status ≠ pago.
- A vencer (amarelo): `data` entre hoje e hoje+3, status ≠ pago.
- Alerta caixa (laranja): se `Σ saídas a pagar do mês > Total em Caixa`.

Click em item abre o dialog de edição do lançamento.

---

## 8. Configurações > Financeiro (Parte 11)

Nova entrada `/configuracoes/financeiro` (card no grid de Configurações). Duas listas CRUD:

- Categorias de Saída — sistema (`is_system`) bloqueia delete/rename; default só bloqueia delete.
- Origens — divididas por tipo; "Entrada de Serviços" bloqueada.

Antes de deletar: query `count(*) FROM financeiro_lancamentos WHERE categoria_id/origem_id = ?`. Se > 0, toast: "Esta categoria está em uso e não pode ser removida."

---

## 9. Padrões transversais (Parte 12)

- Currency input já existe (`CurrencyInput` RTL, centavos automáticos).
- Datas `dd/MM/yyyy` via date-fns.
- React Query `staleTime: 30s` para todas as queries financeiras.
- Skeletons em todas as cargas.
- Mobile-first: lista agrupada com `<Collapsible>`, tabs viram dropdown abaixo de `md`.
- Loading global via `LoadingContext` existente para ações destrutivas/salvamento.
- Validação com Zod + React Hook Form (padrão do projeto).

---

## 10. Ordem de implementação

1. Migration + seeds (aguarda aprovação Supabase).
2. Shell do módulo: rota, sidebar, `MonthSelector`, Context do mês, tabs.
3. Hooks de dados (categorias, origens, lançamentos manuais, auto lines, caixa).
4. Aba Lançamentos + dialogs Entrada/Saída + recorrência + exclusão recorrente.
5. Aba Caixa.
6. Aba Resumo + charts.
7. Notificações.
8. Configurações > Financeiro.
9. Polish responsivo + skeletons + testes manuais dos cenários (double-counting, recorrência, conciliação).

---

## Pontos de atenção / decisões

- **Auto lines não persistidas** (alinhado ao "always real-time, do not store frozen copy"). A coluna `is_auto` fica reservada mas não usada.
- **Lucro Líquido Real** explicitamente exclui categoria "Retiradas" mas inclui Pró-labore (conforme spec).
- **Entrada de Serviços líquida** (descontando `taxa_aplicada`).
- **"Saldo Calculado"**: somo carry-over do mês anterior conforme spec; saídas só entram quando `status='pago'`, entradas sempre que realizadas (auto + manuais).