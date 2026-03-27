

## Plano: Melhorias de Performance do Sistema

### Analise realizada

Foram analisados todos os arquivos principais: `Servicos.tsx`, `Clientes.tsx`, `Dashboard.tsx`, `Estoque.tsx`, `Fornecedores.tsx`, `ServiceDialog.tsx`, `ServiceViewDialog.tsx`, `useAuth.tsx`, e as migrações do banco. Seguem os problemas identificados e as correções propostas.

---

### 1. Criar indices no banco de dados (impacto alto)

Nao existe nenhum indice customizado. Todas as queries filtram por colunas sem indice, causando full table scans.

**Migracao SQL:**
```sql
-- Servicos: filtros e ordenacao
CREATE INDEX idx_servicos_status ON servicos(status);
CREATE INDEX idx_servicos_data_entrada ON servicos(data_entrada);
CREATE INDEX idx_servicos_cliente_cpf ON servicos(cliente_cpf);
CREATE INDEX idx_servicos_carro_placa ON servicos(carro_placa);
CREATE INDEX idx_servicos_status_pagamento ON servicos(status_pagamento);

-- Itens relacionados: JOINs e deletes por servico_id
CREATE INDEX idx_servicos_itens_servico ON servicos_itens(servico_id);
CREATE INDEX idx_servicos_pagamentos_servico ON servicos_pagamentos(servico_id);
CREATE INDEX idx_servicos_custos_servico ON servicos_custos(servico_id);
CREATE INDEX idx_servicos_pneus_servico ON servicos_pneus(servico_id);
CREATE INDEX idx_servicos_historico_servico ON servicos_historico(servico_id);

-- Pagamentos: filtro por data
CREATE INDEX idx_servicos_pagamentos_data ON servicos_pagamentos(data_pagamento);

-- Carros: busca por cliente
CREATE INDEX idx_carros_cliente_cpf ON carros(cliente_cpf);

-- Dashboard: custos por data
CREATE INDEX idx_servicos_custos_data ON servicos_custos(data_compra);
```

---

### 2. Otimizar o salvamento do ServiceDialog (impacto alto)

Atualmente o `handleSave` faz ate 15+ queries sequenciais (delete itens, delete pagamentos, delete custos, select pneus antigos, loop update estoque, delete pneus, insert itens, insert pagamentos, insert custos, insert pneus, loop update estoque). Cada query e uma round-trip ao banco.

**Correcao em `ServiceDialog.tsx`:**
- Agrupar as 3 deletes (itens, pagamentos, custos) em `Promise.all()`
- Agrupar os 3 inserts (itens, pagamentos, custos) em `Promise.all()`
- Para o loop de update do estoque de pneus, buscar todos os pneus de uma vez com `.in('id', ids)` ao inves de N queries individuais

---

### 3. Clientes.tsx — carregar todos os clientes sem paginacao (impacto medio)

`fetchClientes` carrega todos os clientes com seus carros. Com centenas de clientes, isso fica lento.

**Correcao:**
- Implementar busca server-side: quando `search` tiver 3+ caracteres, fazer query com `.ilike('nome', '%search%')` ou filtro por CPF
- Limitar a 50 registros na listagem inicial com `.limit(50)`
- Remover filtragem client-side

---

### 4. Dashboard — queries sem cache (impacto medio)

O Dashboard faz 4 queries paralelas a cada mudanca de filtro, sem cache. Se o usuario voltar ao mesmo filtro, refaz tudo.

**Correcao em `Dashboard.tsx`:**
- Migrar para React Query (`useQuery`) com `staleTime` de 2 minutos
- Isso evita re-fetches desnecessarios ao navegar entre paginas

---

### 5. ServiceDialog — carregamento inicial pesado (impacto medio)

O `useEffect` carrega 7 tabelas de referencia toda vez que o dialog abre. Essas tabelas (marcas, modelos, maquininhas, bandeiras, taxas) raramente mudam.

**Correcao:**
- Mover essas queries para React Query com `staleTime: Infinity` (cache permanente na sessao)
- Isso elimina re-fetches ao abrir/fechar o dialog repetidamente

---

### 6. Servicos.tsx — busca por texto sem debounce (impacto baixo-medio)

Cada caractere digitado no campo de busca dispara uma nova query ao Supabase.

**Correcao:**
- Adicionar debounce de 400ms no campo `search` antes de disparar `fetchServicos`
- Usar um `debouncedSearch` separado do `search` para manter a UI responsiva

---

### Resumo dos arquivos modificados

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Criar ~14 indices |
| `ServiceDialog.tsx` | Paralelizar deletes/inserts, batch update estoque |
| `Clientes.tsx` | Busca server-side com limit |
| `Dashboard.tsx` | React Query com cache |
| `Servicos.tsx` | Debounce na busca |

### Impacto esperado

- Queries de listagem: **2-5x mais rapidas** com indices
- Salvamento de servico: **~50% menos tempo** (menos round-trips)
- Navegacao entre paginas: **instantanea** com cache do React Query
- Busca: **menos carga no banco** com debounce

