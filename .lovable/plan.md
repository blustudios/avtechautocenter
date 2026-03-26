

## Plano: Migrar serviços com status legado "a_iniciar"

### Causa raiz

A coluna `servicos.status` tinha `DEFAULT 'a_iniciar'`. Quando o fluxo foi atualizado para os novos status (`orcamento`, `em_progresso`, `finalizado`, `cancelado`), o default da coluna e os serviços existentes não foram atualizados.

O serviço 2603C70 (e possivelmente outros) ainda tem `status = 'a_iniciar'` no banco.

### Alterações

#### 1. Migração SQL — corrigir dados e default

```sql
-- Migrar serviços legados: a_iniciar → em_progresso
UPDATE servicos SET status = 'em_progresso' WHERE status = 'a_iniciar';

-- Migrar serviços legados: entregue → finalizado
UPDATE servicos SET status = 'finalizado' WHERE status = 'entregue';

-- Alterar o default da coluna para o novo status inicial
ALTER TABLE servicos ALTER COLUMN status SET DEFAULT 'orcamento';
```

#### 2. Limpar mapeamentos legados (opcional)

Remover as entradas `a_iniciar` e `entregue` de:
- `src/lib/format.ts` — `statusLabels`
- `src/components/StatusBadge.tsx` — `statusStyles`

Isso garante que se algum status inesperado aparecer, ele cairá no fallback genérico em vez de parecer intencional.

### Arquivos modificados
- **Migração SQL** — UPDATE dados + ALTER DEFAULT
- `src/lib/format.ts` — remover labels legados
- `src/components/StatusBadge.tsx` — remover estilos legados

