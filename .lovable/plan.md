## Plano: Relatórios → Pagamentos

Adicionar um segundo relatório seguindo exatamente o mesmo padrão de UX/arquitetura do "Relatório de Custos" já implementado.

### 1. Navegação

- Adicionar segundo card na página índice `src/pages/Relatorios.tsx` (ícone `Wallet` ou `CreditCard` do lucide).
- Nova rota `/relatorios/pagamentos` em `src/App.tsx`.
- Novo arquivo: `src/pages/relatorios/Pagamentos.tsx`.

### 2. Fonte de dados

Tabela `servicos_pagamentos` (já existe) com joins:
- `maquininhas(nome)`
- `bandeiras(nome)`
- `servicos!inner(id, status, status_pagamento, data_entrada, carro_placa/_livre, carro_marca/_livre, carro_modelo/_livre, cliente_cpf, clientes(nome))`

### 3. Filtros (mesmo padrão de Custos)

1. **Período** — presets Hoje, Ontem, Semana, Mês, Mês Passado, Personalizado. Aplicado sobre `data_pagamento`.
2. **Status do pagamento** — Select: Todos / Pagos / Pendentes (`pago = true/false`). Default: Todos.
3. **Tipo de pagamento** — Select com a lista `tiposPagamento` de `src/lib/format.ts` (A Definir, Pix CNPJ, Pix Máquina, Débito, Crédito à vista, Crédito Parcelado, Dinheiro) + "Todos".
4. **Maquininha** — Select populado de `maquininhas` (Todas / Sem maquininha / lista).
5. **Bandeira** — Select dependente de maquininha (Todas / lista de `bandeiras` filtradas).
6. **ID do serviço** — input com debounce 350ms (`ilike`).
7. **Busca cliente** — input com debounce buscando por nome (via join `clientes.nome`) — opcional, posso omitir se preferir manter enxuto.
8. Botão "Limpar filtros".

### 4. Card de Resumo (sticky em mobile)

Quatro KPIs:
- **Total Recebido** (apenas `pago=true`) — destaque verde (`text-status-pago`).
- **Total Pendente** (apenas `pago=false`) — destaque laranja.
- **Total de Taxas** — soma de `valor * taxa_aplicada / 100` no período (custo financeiro com maquininhas).
- **Nº de pagamentos** e **Nº de serviços distintos**.

Implementado via nova **RPC** `relatorio_pagamentos_resumo(...)` (migration) com os mesmos filtros, retornando `{ total_pago, total_pendente, total_taxas, total_itens, total_servicos }`. Mesma justificativa do relatório de Custos (evita limite de 1000 linhas e mantém consistência).

### 5. Listagem (paginada server-side, 25/página)

Colunas (desktop tabela / mobile cards):

| Coluna | Fonte |
|---|---|
| Data Pagamento | `data_pagamento` (ou "—" se não pago) |
| Tipo | `tipo` |
| Maquininha / Bandeira | `maquininhas.nome` + `bandeiras.nome` |
| Parcelas | `parcelas` (quando aplicável) |
| Valor Bruto | `valor` |
| Taxa | `taxa_aplicada%` + valor da taxa em R$ |
| Valor Líquido | `valor * (1 - taxa/100)` |
| Status | badge: Pago (verde) / Pendente (cinza) |
| ID Serviço | clicável → abre `ServiceViewDialog` (mesmo padrão do relatório de Custos) |
| Cliente | `clientes.nome` (ou "—") |
| Veículo | marca + modelo + placa |

Ordenação padrão: `data_pagamento DESC`, fallback `id DESC`. Pagamentos sem `data_pagamento` aparecem por último.

### 6. Funcionalidades extras

- **Exportar CSV** (até 5.000 linhas) — mesmo padrão de Custos, com todas as colunas + Valor Líquido e Taxa em R$.
- **Botão refresh** no header.
- **Link "Ver serviço"** abrindo `ServiceViewDialog` em modo read-only.
- **Toggle "Apenas pagos"** como atalho rápido (opcional, alternativa ao select de status).

### 7. Sugestões adicionais de valor

1. **Subtotais por tipo de pagamento** no rodapé do resumo (mini-tabela colapsável: Pix R$ X / Crédito R$ Y / Débito R$ Z / Dinheiro R$ W) — ajuda a entender o mix de recebimentos. Pode vir de RPC adicional ou de query agregada PostgREST.
2. **Indicador de taxa média** no card de resumo (% médio ponderado pelo valor).
3. **Comparativo período anterior** (futuro, opcional).

### 8. Detalhes técnicos

**Migration** — nova função:
```sql
CREATE OR REPLACE FUNCTION public.relatorio_pagamentos_resumo(
  p_data_from date, p_data_to date,
  p_status text,           -- 'todos' | 'pago' | 'pendente'
  p_tipo text,
  p_maquininha_id uuid, p_sem_maquininha boolean,
  p_bandeira_id uuid,
  p_servico_id text
) RETURNS TABLE (
  total_pago numeric, total_pendente numeric, total_taxas numeric,
  total_itens bigint, total_servicos bigint
) ...
```
Filtra `servicos_pagamentos` aplicando todos os parâmetros (com `IS NULL` para opcionais) e retorna agregados. `SECURITY DEFINER`, `GRANT EXECUTE ... TO authenticated`.

**Query principal**:
```ts
supabase.from('servicos_pagamentos')
  .select(`id, data_pagamento, tipo, valor, taxa_aplicada, parcelas, pago,
           maquininha:maquininhas(nome), bandeira:bandeiras(nome),
           servico:servicos!inner(id, status, status_pagamento, data_entrada,
             carro_placa, carro_marca, carro_modelo,
             carro_placa_livre, carro_marca_livre, carro_modelo_livre,
             cliente:clientes(nome))`, { count: 'exact' })
  .range(from, to)
  .order('data_pagamento', { ascending: false, nullsFirst: false })
```

**React Query keys**: `['relatorio-pagamentos', filtros, page]`, `['relatorio-pagamentos-resumo', filtros]`, `['maquininhas-lista']`, `['bandeiras-lista']`. `staleTime: 2 min`.

### Entregáveis

1. Migration `relatorio_pagamentos_resumo` (RPC com GRANT).
2. `src/pages/relatorios/Pagamentos.tsx` — novo relatório completo.
3. `src/pages/Relatorios.tsx` — adicionar card "Pagamentos".
4. `src/App.tsx` — registrar rota `/relatorios/pagamentos`.

### Confirmações antes de implementar

- Mantém **busca por cliente** ou prefere relatório só com filtros transacionais (ID serviço + maquininha)?
- Inclui o card extra de **subtotais por tipo de pagamento**?
- O **Valor Líquido** deve descontar apenas a taxa, ou também algo relacionado a parcelas? (atualmente o sistema já guarda `taxa_aplicada` final — usaria isso direto.)
