
## Objetivo
Permitir gerenciar todas as recorrências existentes em uma tela dedicada, com edição opcionalmente propagada para os lançamentos futuros da mesma recorrência.

## 1. Ponto de acesso
- Em `TabLancamentos.tsx`, adicionar um botão `variant="ghost"` **"Gerenciar recorrências"** (ícone `Repeat`) logo abaixo da seção SAÍDAS, alinhado à esquerda.
- Ao clicar, navegar para a nova rota `/financeiro/recorrencias` (registrada em `App.tsx`).

## 2. Nova página `src/pages/financeiro/Recorrencias.tsx`
Layout: header com botão "Voltar" para `/financeiro` + lista/tabela de recorrências.

Cada linha exibe: Título · Frequência · Valor previsto · Próximo vencimento · Data fim · Categoria · Origem · Nº de ocorrências futuras · botão "Editar".

### Fonte de dados
Query nova em `useFinanceiroData.ts` — `useRecorrencias()`:
1. Buscar `financeiro_recorrencias` (id, frequencia, data_inicio, data_fim).
2. Buscar `financeiro_lancamentos` onde `recorrencia_id IN (...)` e `parcela_grupo_id IS NULL` (exclui faturados/parcelados — o campo `parcela_grupo_id` distingue esses grupos).
3. Para cada recorrência, agrupar: usar o lançamento mais recente como "representativo" para exibir título/valor/categoria/origem/observações; contar quantos são futuros (`data >= hoje`).
4. Ignorar recorrências sem lançamentos vinculados (órfãs).

**Nota:** faturados são identificados por `parcela_grupo_id NOT NULL` combinado com `recorrencia_id IS NULL` (grupos de fatura não usam `recorrencia_id`), então a filtragem por `recorrencia_id NOT NULL` já garante que não apareçam. Confirmar no `LancamentoSaidaDialog` durante a implementação.

## 3. Diálogo de edição `EditRecorrenciaDialog.tsx`
Campos editáveis, pré-preenchidos a partir do lançamento representativo:
- Título (`descricao`)
- Frequência (`diaria` | `semanal` | `mensal` | `anual`) — **adiciona nova opção "diária"**
- Valor previsto (`CurrencyInput`)
- Data fim da recorrência (`Input type=date`)
- Categoria (`Select`)
- Origem (`Select`)
- Observações padrão (`Textarea`)

Ao clicar em **Salvar** → abre `AlertDialog` com escolha de escopo:
- **Somente este mês** — atualiza apenas o lançamento do mês atual (identificado pelo `MonthContext` ativo, ou o próximo futuro se não houver no mês).
- **Este e todos os futuros** — atualiza todos os lançamentos com `recorrencia_id = X` e `data >= data_do_lancamento_pivô`.

Mudanças de **frequência** e **data fim** afetam a estrutura da recorrência e forçam automaticamente o escopo "futuros":
- Se `data_fim` mudou ou `frequencia` mudou → deletar lançamentos futuros existentes dessa recorrência (data > hoje ou data > pivô) e regenerar via `expandRecurrence` com os novos parâmetros, preservando o `recorrencia_id` e usando o título/valor/categoria/origem/observações novos.
- Atualizar a linha em `financeiro_recorrencias` (frequencia, data_fim).

Mudanças apenas em título/valor/categoria/origem/observações → simples `UPDATE` em `financeiro_lancamentos` conforme escopo escolhido.

Lançamentos com `status_pagamento = 'pago'` são preservados mesmo no escopo "futuros" (não sobrescreve pagos).

## 4. Suporte a frequência diária
- `src/lib/financeiro/recurrence.ts`: adicionar `'diaria'` ao tipo `Frequencia` e o ramo `cursor = addDays(start, i)` no `expandRecurrence`. Aumentar o limite de segurança de 600 para 4000.
- `LancamentoSaidaDialog.tsx`: adicionar opção "Diária" no `Select` de frequência.

## 5. Alterações no banco
Nenhuma migração de schema necessária — o schema atual comporta tudo. Apenas escrita via `supabase--insert` para updates/deletes durante a edição.

## Considerações técnicas
- Excluir recorrências cujo único vínculo seja com lançamentos faturados (não deve ocorrer no fluxo atual, mas filtro por `parcela_grupo_id IS NULL` garante).
- Se a recorrência não tem mais lançamentos futuros após edição, permanece no banco mas some da lista (filtro por `count > 0`).
- Invalidar `['fin']` no react-query após salvar.

## Arquivos afetados
```text
src/pages/financeiro/Recorrencias.tsx          (novo)
src/components/financeiro/EditRecorrenciaDialog.tsx (novo)
src/components/financeiro/TabLancamentos.tsx   (botão)
src/hooks/financeiro/useFinanceiroData.ts      (useRecorrencias)
src/lib/financeiro/recurrence.ts               (freq diária)
src/components/financeiro/LancamentoSaidaDialog.tsx (opção diária no select)
src/App.tsx                                    (rota)
```
