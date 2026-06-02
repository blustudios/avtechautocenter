## Plano: corrigir filtros avançados que escondem resultados na paginação

### Causa raiz

Em `src/pages/Servicos.tsx`, os filtros **Data de Pagamento** (`paymentDateFrom/To`) e **Tipo de Pagamento** (`paymentTypeFilter`) são aplicados **client-side, apenas na página atual de 20 itens** (linhas 172-198). Como a paginação acontece no servidor antes desses filtros rodarem, serviços que dariam match podem estar em páginas seguintes e ficam invisíveis até o usuário avançar manualmente.

### Correção

Mover os dois filtros para a query server-side em `fetchServicos`:

1. **`paymentTypeFilter`**: usar inner join no relacionamento, trocando `servicos_pagamentos(...)` por `servicos_pagamentos!inner(...)` e adicionando `query.eq('servicos_pagamentos.tipo', paymentTypeFilter)` quando ativo.

2. **`paymentDateFrom/To`**: aplicar `query.gte('servicos_pagamentos.data_pagamento', ...)` e `.lte(...)` (ou `.eq(...)` para dia único) sobre o mesmo inner join. Quando qualquer um dos dois filtros de pagamento estiver ativo, o select usa `!inner` para que o Postgres filtre os serviços que tenham ao menos um pagamento correspondente.

3. Remover o bloco client-side `filtered = servicos.filter(...)` (linhas 172-198) — passa a usar `servicos` direto. Manter apenas o `sorted` por `data_pagamento` (que ordena a página atual).

4. Garantir que `paymentDateFrom`, `paymentDateTo` e `paymentTypeFilter` entrem nas dependências de `fetchServicos` e no `useEffect` de reset de página (linha 159), para que mudar o filtro recarregue da página 0.

### Resultado esperado

A listagem passa a mostrar apenas serviços que casam com todos os filtros, paginados corretamente — sem "buracos" entre páginas.

### Arquivos modificados
- `src/pages/Servicos.tsx`
