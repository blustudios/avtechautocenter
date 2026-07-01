# Plano: Aba "Estoque de Pneus" em Financeiro

## Objetivo
Adicionar uma quarta aba em `/financeiro` com uma visão executiva do estoque de pneus e das vendas realizadas, respeitando o seletor de mês já existente.

## 1. Nova aba na página Financeiro
Em `src/pages/Financeiro.tsx`, incluir `<TabsTrigger value="estoque-pneus">Estoque de Pneus</TabsTrigger>` e o `<TabsContent>` correspondente, renderizando um novo componente `TabEstoquePneus`.

## 2. Componente `src/components/financeiro/TabEstoquePneus.tsx`
Layout em grid responsivo (mobile: 1 coluna; md: 2; xl: 4), usando os mesmos `Card` do restante do módulo Financeiro para manter consistência visual.

### KPIs (cards)
Três cards no topo com ícone à esquerda, label pequena e valor grande:

1. **Valor médio em Estoque** — ícone `Wallet`, cor primária.  
   Fórmula: `SUM(quantidade * valor_medio_compra)` em `estoque_pneus`. Formatado como BRL.
2. **Pneus em Estoque** — ícone `Package`.  
   Fórmula: `SUM(quantidade)` em `estoque_pneus`.
3. **Pneus vendidos no mês** — ícone `TrendingDown`.  
   Fórmula: `SUM(sp.quantidade)` em `servicos_pneus sp` JOIN `servicos s` onde `sp.baixa_estoque = true`, `s.status IN ('em_progresso','finalizado')` e a data de referência cai no mês selecionado.

Os dois primeiros usam `staleTime: 0` + `refetchOnWindowFocus` (ou invalidação a partir de mutações existentes) para refletir "tempo real"; o terceiro fica atrelado ao `useMonth()`.

### Gráfico "Pneus vendidos por dia"
Card ocupando a largura total abaixo dos KPIs. `ResponsiveContainer` + `BarChart` do Recharts (via `ChartContainer` existente) com:
- Eixo X: dia do mês (1..último dia); no mês corrente, corta no dia atual.
- Eixo Y: quantidade de pneus (inteiro).
- Barras na cor primária (`hsl(var(--primary))`), tooltip com data completa e quantidade.
- Estado vazio: mensagem "Sem vendas registradas neste mês".

## 3. Data hook `src/hooks/financeiro/useEstoquePneusData.ts`
Três `useQuery` distintas para permitir invalidação independente:

- `['fin','estoque-pneus','totais']` → `select quantidade, valor_medio_compra from estoque_pneus`, agrega no cliente.
- `['fin','estoque-pneus','vendas', mesRef]` → `select quantidade, servicos!inner(status, data_encerramento, data_entrada) from servicos_pneus where baixa_estoque = true and servicos.status in ('em_progresso','finalizado')` filtrado pelo intervalo do mês via `monthRange()`.
- A partir do resultado das vendas, calcula:
  - `totalMes`: soma das quantidades.
  - `porDia`: agrupamento por dia (chave `yyyy-MM-dd`), preenchendo dias faltantes com 0 para o gráfico ficar contínuo.

**Regra de data de venda:** usar `data_encerramento` quando existir; senão `data_entrada`. Isso alinha com a lógica de "vendido de fato" já usada em relatórios do sistema.

## 4. Detalhes técnicos
- Seguir o padrão `MonthProvider` já existente (a aba lê `useMonth()` para reagir ao seletor global de mês).
- Reaproveitar `formatCurrency` de `src/lib/format.ts` e `monthRange`/`toMesRef` de `src/lib/financeiro/dates.ts`.
- Skeleton loaders enquanto `isLoading` (padrão do projeto).
- Nenhuma alteração de schema, RLS ou migração é necessária — todos os dados já existem.

## Arquivos a criar/editar
- `src/pages/Financeiro.tsx` — adicionar aba.
- `src/components/financeiro/TabEstoquePneus.tsx` — novo.
- `src/hooks/financeiro/useEstoquePneusData.ts` — novo.

## Fora do escopo
- Registro histórico de estoque (snapshots). A "atualização em tempo real" usa o estado atual da tabela `estoque_pneus`; não guardamos histórico do valor médio.
- Filtros adicionais (por marca/aro) — podem entrar em iteração futura.
