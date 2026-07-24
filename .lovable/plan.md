
## Objetivo
Criar uma tela dedicada de gestão de recorrências de saídas, acessível via botão em Financeiro > Lançamentos, permitindo editar e excluir recorrências em dois escopos: **somente esta ocorrência** ou **esta e todas as futuras**.

## 1. Ponto de entrada
- Em `src/components/financeiro/TabLancamentos.tsx`, adicionar um botão discreto **"Gerenciar recorrências"** logo abaixo do bloco de SAÍDAS (alinhado à esquerda, `variant="ghost"` com ícone `Repeat`).
- Ao clicar, navegar para nova rota `/financeiro/recorrencias` (registrada em `src/App.tsx`).

## 2. Nova página `src/pages/financeiro/Recorrencias.tsx`

### Fonte de dados
Uma única consulta agregando as recorrências ativas:
- `financeiro_lancamentos` com `recorrencia_id IS NOT NULL`, `tipo = 'saida'`, e cuja categoria não seja "Faturados" (filtro por `categoria.nome ILIKE 'faturad%'` OU `is_system` correspondente).
- Junção com `financeiro_recorrencias` (para `frequencia` e `data_fim`) e `financeiro_categorias` / `financeiro_origens` (para exibição).

Cada linha da UI representa **uma recorrência única** (agrupada por `recorrencia_id`), exibindo os dados da **próxima ocorrência a vencer** como "instância representativa". Guarda-se também a instância específica clicada, pois o escopo "somente esta" opera sobre uma ocorrência individual.

### Seções
- **Mês Atual** — recorrências que possuem ao menos uma ocorrência dentro do mês selecionado (usa `MonthContext` já existente).
- **Outras recorrências** — recorrências que só têm ocorrências em meses futuros (sem instância no mês atual).
- Ocorrências passadas não entram (nada retroativo).

### Card/linha
Exibe: título, valor previsto, frequência, próxima data, categoria, origem, badge de "encerra em DD/MM/AAAA" (se `data_fim` definido). Ações: **Editar** (abre dialog) e **Lixeira vermelha**.

## 3. Diálogo de edição `EditRecorrenciaDialog`
Reaproveitando estilo do `LancamentoSaidaDialog`. Campos editáveis:
- Título (`descricao`)
- Frequência: **Mensal** ou **Anual** apenas (Select restrito)
- Valor previsto
- Data de encerramento (`financeiro_recorrencias.data_fim`)
- Categoria
- Origem
- Observações

Ao clicar em **Salvar**, abre um segundo AlertDialog perguntando o escopo:
- **Somente esta ocorrência** — atualiza apenas o `financeiro_lancamentos` da instância clicada. Não toca em `financeiro_recorrencias`.
- **Esta e todas as futuras** — atualiza todos os `financeiro_lancamentos` com o mesmo `recorrencia_id` E `data >= data_da_instancia`; atualiza `financeiro_recorrencias` (frequência/data_fim). Alteração de frequência exige recomputar as datas das ocorrências futuras: apagar as futuras existentes (>= data atual da instância) e recriá-las via `expandRecurrence` (`src/lib/financeiro/recurrence.ts`) usando novo `data_fim`.

## 4. Exclusão
Clique na lixeira dispara um AlertDialog com as duas opções:
- **Somente esta ocorrência** — `DELETE` do único `financeiro_lancamentos`.
- **Esta e todas as futuras** — `DELETE` de todas as instâncias com mesmo `recorrencia_id` e `data >= instância`; se não sobrar nenhuma futura E nenhuma passada foi preservada (opcional), remover também a linha em `financeiro_recorrencias`. Alinhar com o comportamento já usado em `DeleteRecurrenceDialog.tsx` para manter consistência.

## 5. Invalidations
Após qualquer mutação, invalidar `['fin']` (React Query) para atualizar Lançamentos, Resumo e Caixa.

## Detalhes técnicos
- Novos arquivos: `src/pages/financeiro/Recorrencias.tsx`, `src/components/financeiro/EditRecorrenciaDialog.tsx`.
- Ajustes: `src/App.tsx` (rota), `src/components/financeiro/TabLancamentos.tsx` (botão + `useNavigate`).
- A lógica de expansão de datas usa a função existente `expandRecurrence`. Frequência **diária/semanal** fica fora da UI conforme solicitado; se um registro legado tiver `semanal`, exibimos read-only "Semanal" e forçamos escolha entre Mensal/Anual ao salvar em escopo futuro.
- Filtro "Faturados": faturas usam `parcela_grupo_id`, mas o pedido é excluir a **categoria** Faturados — filtrar por `categoria.nome` (case-insensitive `faturad%`). Ajustável se a categoria tiver outro nome exato.
- Nenhuma alteração de schema é necessária.
