

## Plano: Melhorias de Performance — IMPLEMENTADO ✅

### Alterações realizadas

1. **14 índices criados no banco** — servicos, servicos_itens, servicos_pagamentos, servicos_custos, servicos_pneus, servicos_historico, carros
2. **ServiceDialog.tsx** — deletes e inserts paralelizados com Promise.all(); batch update de estoque de pneus
3. **Clientes.tsx** — busca server-side com `.ilike()` + `.limit(50)` + debounce 400ms
4. **Dashboard.tsx** — React Query com `staleTime: 2min` substituindo useState/useEffect
5. **Servicos.tsx** — debounce 400ms no campo de busca (`debouncedSearch`)
