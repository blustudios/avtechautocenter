## Plano: Módulo Relatórios → Custos

### 1. Navegação

- Adicionar item **"Relatórios"** no `AppSidebar.tsx` (ícone `FileBarChart` do lucide), rota base `/relatorios`.
- Como teremos sub-categorias futuramente, criar uma página índice `/relatorios` com cards/atalhos para cada categoria (começando com "Custos"), e a primeira sub-rota `/relatorios/custos`.
- Estrutura de arquivos:
  - `src/pages/Relatorios.tsx` (índice com cards)
  - `src/pages/relatorios/Custos.tsx` (relatório de custos)
- Registrar rotas em `src/App.tsx`.

### 2. Página `Relatórios → Custos`

#### Layout
- Cabeçalho com título "Relatórios de Custos" e breadcrumb (Relatórios / Custos).
- **Card de Resumo** no topo (sticky em mobile): 
  - Total de itens filtrados
  - **Soma total dos custos filtrados** (destaque em vermelho, padrão de cor de custo)
  - Quantidade total de itens (soma do campo `quantidade`)
  - Número de serviços distintos envolvidos
- Barra de filtros (mesmo padrão visual da página de Serviços).
- Lista paginada (server-side, mesmo padrão de paginação existente).

#### Filtros
1. **Período (presets rápidos)** — reaproveitar exatamente o conjunto da página Serviços: Hoje, Ontem, Esta Semana, Este Mês, Mês Passado, Custom. Filtro aplicado sobre `servicos_custos.data_compra`.
2. **Datas customizadas** (from/to) quando preset = custom.
3. **Fornecedor** — Select populado de `fornecedores` (com opção "Todos" e "Sem fornecedor").
4. **Busca por nome do item** — input com debounce (300ms), usa `ilike` em `servicos_custos.item`.
5. **ID do serviço** (sugestão extra) — campo de busca rápida por ID.
6. Botão "Limpar filtros".

#### Listagem (colunas sugeridas)
Cada linha = 1 registro de `servicos_custos` enriquecido:

| Coluna | Fonte |
|---|---|
| Data compra | `servicos_custos.data_compra` |
| Item | `servicos_custos.item` |
| Qtd | `servicos_custos.quantidade` |
| Valor unitário | calculado (`valor / quantidade`) |
| Valor total | `servicos_custos.valor` |
| Fornecedor | join `fornecedores.nome` |
| ID Serviço | `servicos.id` (clicável → abre `ServiceViewDialog`) |
| Status serviço | badge usando `StatusBadge` |
| Cliente | `clientes.nome` (ou "—") |
| Veículo | `marca + modelo + placa` (livre ou cadastrado) |
| Data entrada serviço | `servicos.data_entrada` |

**Mobile:** cards empilhados com as principais infos (Item, Valor, Data, Fornecedor, Serviço + Cliente/Veículo). Desktop: tabela.

#### Ordenação
- Padrão: `data_compra DESC`.
- Colunas ordenáveis: Data compra, Valor, Item, Fornecedor.

#### Paginação
- Server-side, 25 itens por página (mesmo padrão de Serviços).
- Footer com `Pagination` e contador "Mostrando X–Y de Z".

### 3. Cálculo do total filtrado

Importante: a paginação retorna apenas a página atual, então o "Total filtrado" **não** pode ser somado no client.

**Solução:** rodar uma segunda query agregada em paralelo à query paginada, aplicando exatamente os mesmos filtros, retornando `sum(valor)` e `count(*)`. Opções:
- (a) RPC Postgres `relatorio_custos_resumo(filtros...)` — mais limpo e performático.
- (b) Query `.select('valor.sum(), id.count()')` via PostgREST aggregate — funciona sem migration.

**Recomendação:** opção (a) via `supabase--migration` criando função `public.relatorio_custos_resumo(...)` que recebe os filtros e devolve `{ total_valor numeric, total_itens int, total_quantidade numeric, total_servicos int }`. Garante consistência e evita problemas com limite de 1000 linhas.

### 4. Performance e Cache

- React Query com `staleTime: 2 min` (padrão Dashboard).
- Query keys: `['relatorio-custos', filtros, page]` e `['relatorio-custos-resumo', filtros]`.
- Lista de fornecedores em cache infinito (`['fornecedores-lista']`).

### 5. Sugestões extras de melhoria

1. **Exportar CSV** dos custos filtrados (botão no canto superior). Útil para contabilidade — usa o mesmo conjunto filtrado (sem paginação, com `limit` de segurança ex. 5.000).
2. **Agrupamento por fornecedor** (toggle): segunda visualização que agrupa e mostra subtotal por fornecedor — ajuda a entender concentração de compras.
3. **Comparativo período anterior**: pequeno indicador no card de resumo ("vs período anterior: +12%") — opcional, baseado no preset selecionado.
4. **Click no ID do serviço** abre o `ServiceViewDialog` em modo read-only (já existe), permitindo navegar para o serviço sem sair do relatório.
5. **Estrutura preparada para próximos relatórios** — criar `src/components/relatorios/ReportLayout.tsx` reutilizável (cabeçalho + breadcrumb + slot de filtros + slot de resumo + slot de conteúdo) para padronizar futuros relatórios (Faturamento, Pneus mais vendidos, Clientes top, Lucratividade por serviço, etc.).

### 6. Detalhes técnicos

- Query principal (paginada):
  ```ts
  supabase
    .from('servicos_custos')
    .select(`
      id, data_compra, item, quantidade, valor, fornecedor_id, servico_id,
      fornecedores(nome),
      servicos!inner(id, status, data_entrada, cliente_cpf, carro_placa, carro_marca, carro_modelo,
                    carro_placa_livre, carro_marca_livre, carro_modelo_livre,
                    clientes(nome))
    `, { count: 'exact' })
    .range(from, to)
    .order('data_compra', { ascending: false })
  ```
- Filtros aplicados com `.gte/.lte` (data), `.eq` (fornecedor), `.ilike` (item), `.eq` (servico_id).
- Função RPC para resumo (mesmos parâmetros).

### Entregáveis

1. Migration: função `relatorio_custos_resumo`.
2. `src/pages/Relatorios.tsx` — índice com card "Custos".
3. `src/pages/relatorios/Custos.tsx` — relatório completo.
4. `src/components/relatorios/ReportLayout.tsx` — layout reutilizável.
5. Atualização de `AppSidebar.tsx` e `App.tsx` (rotas).
