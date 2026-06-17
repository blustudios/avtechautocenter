## Objetivo
Adicionar opção **"Faturado"** no cadastro de Saída, permitindo lançar uma compra dividida em **N faturas com data e valor individuais** (não uniforme como Parcelado).

## Comportamento

**UI (no `LancamentoSaidaDialog.tsx`):**
- Novo checkbox **Faturado**, ao lado de Parcelado e Recorrência.
- Mutuamente exclusivo com Parcelado e Recorrência (marcar um desmarca os outros).
- Quando marcado, esconde os campos padrão *Valor Previsto / Valor Realizado / Status de Pagamento / Data da saída* (substituídos pelas linhas de faturas) — Título, Categoria, Origem e Observações continuam normais.
- Mostra uma lista de linhas, cada uma com:
  - Campo **Data** (`<Input type="date">`)
  - Campo **Valor (R$)** (`CurrencyInput`)
  - Botão remover (ícone X) — desabilitado quando só há 1 linha
- Primeira linha vem pré-preenchida com a data de hoje e valor 0.
- Abaixo, link **"+ incluir"** que adiciona nova linha:
  - **Data**: mês seguinte da última linha (`addMonths(últimaData, 1)`)
  - **Valor**: copia o valor da primeira linha

**Lógica ao Salvar:**
- Validar: título, ≥1 linha, todas com data e valor > 0.
- Gerar um `fatura_grupo_id` (UUID), reaproveitando as colunas existentes `parcela_grupo_id`, `parcela_atual`, `parcela_total` (não criar schema novo — semanticamente equivalente a parcelas com datas/valores livres).
- Ordenar linhas por data crescente; numerar 1..N.
- Para cada linha, inserir um `financeiro_lancamentos` com:
  - `data` = data da linha
  - `valor_previsto` = `valor_realizado` = valor da linha
  - `status_pagamento`:
    - `pago` se a data ≤ hoje
    - `a_pagar` se a data > hoje
  - `parcela_atual` = posição, `parcela_total` = N, `parcela_grupo_id` = grupo
  - `mes_referencia` = `startOfMonth(data)`
  - `descricao`, `categoria_id`, `origem_id`, `observacoes` iguais para todas
- Toast: "N fatura(s) registrada(s)".

**Exibição (`TabLancamentos.tsx`):**
- Nenhuma mudança necessária: o sufixo "(1 de N)" já é renderizado quando `parcela_total > 0` (lógica do Parcelado).

## Casos de borda
- Edição (`edit`): bloco Faturado oculto, como já é feito hoje com Parcelado/Recorrência.
- Não pergunta confirmação (diferente do Parcelado) — todas as linhas são explícitas, o usuário já decidiu.
- Se faturado marcado, desabilitar visualmente Parcelado e Recorrência (e vice-versa).

## Arquivos alterados
- `src/components/financeiro/LancamentoSaidaDialog.tsx` — toda a mudança (estado `faturado`, array `faturas`, render do bloco, função `saveFaturado`, ajuste em `handleSaveClick` e `validate`).

Sem migrations, sem alteração no hook de dados, sem mudança no `LancamentoEntradaDialog` (recurso só para Saída).