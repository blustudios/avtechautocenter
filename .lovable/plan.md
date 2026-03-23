

## Plano: Filtros avançados na tela de Serviços (Ordenação + Filtro por Data de Pagamento)

### 1. Buscar pagamentos junto com serviços

**`fetchServicos`**: Alterar query para incluir `servicos_pagamentos(data_pagamento, pago)` no select. Mapear a primeira `data_pagamento` (ordenada) para cada serviço como `primeira_data_pagamento`.

**Interface `Servico`**: Adicionar `primeira_data_pagamento?: string` e `pagamentos?: { data_pagamento: string; pago: boolean }[]`.

### 2. Ordenação

**Novos estados**: `sortField` (`'data_entrada' | 'data_pagamento' | 'id'`, default `'data_entrada'`) e `sortDirection` (`'asc' | 'desc'`, default `'desc'`).

**UI**: Select "Ordenar por" com as 3 opções + botão toggle asc/desc com ícone `ArrowUpDown`. Posicionado na linha de filtros existente.

**Lógica**: `.sort()` após filtrar, usando `primeira_data_pagamento` para ordenação por data de pagamento (sem pagamento vai pro final).

### 3. Seção "Filtros Avançados" colapsável

**UI**: Usar `Collapsible` do Radix (já existe em `src/components/ui/collapsible.tsx`):
- `CollapsibleTrigger` com ícone `ChevronRight` (rotaciona ao abrir) + texto "Filtros Avançados"
- Por padrão fechado (`open={false}`)
- Dentro do `CollapsibleContent`: filtro de Data de Pagamento

### 4. Filtro por Data de Pagamento (dentro de Filtros Avançados)

**Novos estados**: `paymentDateFrom` e `paymentDateTo` (ambos `Date | undefined`).

**UI**: Label "Data de Pagamento:" + 2 date pickers (mesmo estilo do período personalizado existente).

**Lógica**: Se apenas `paymentDateFrom` preenchido, filtra pela data exata. Se ambos preenchidos, filtra pelo range. Verifica se ao menos 1 pagamento do serviço cai no intervalo.

### Arquivo modificado
- `src/pages/Servicos.tsx`

