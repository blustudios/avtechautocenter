

## Plano: Corrigir bug de orçamentos não salvando

### Causa raiz
Linha 244 de `ServiceDialog.tsx`:
```ts
data_entrada: isOrcamento ? null : form.data_entrada,
```
O campo `data_entrada` no banco tem constraint `NOT NULL`. Passar `null` causa erro 400, e o serviço nunca é inserido.

### Correção

**Arquivo: `src/components/services/ServiceDialog.tsx`** — linha 244

Alterar de:
```ts
data_entrada: isOrcamento ? null : form.data_entrada,
```
Para:
```ts
data_entrada: form.data_entrada || new Date().toISOString().split('T')[0],
```

Isso garante que orçamentos sempre tenham uma `data_entrada` valida (usa a data atual como fallback), respeitando a constraint do banco. Quando o orçamento for "executado" (transição para `em_progresso`), a `data_entrada` sera atualizada para a data real via `ServiceViewDialog`.

### Arquivo modificado
- `src/components/services/ServiceDialog.tsx` (1 linha)

