

## Plano: Campo de data de pagamento por forma de pagamento

### Resumo
Adicionar um campo de data em cada forma de pagamento nos serviços, para registrar quando o pagamento efetivamente entrou.

### 1. Migration — nova coluna `data_pagamento` em `servicos_pagamentos`

```sql
ALTER TABLE servicos_pagamentos ADD COLUMN data_pagamento date;
```

Coluna nullable, sem default — o usuário preenche manualmente.

### 2. `ServiceDialog.tsx` — formulário

- Adicionar `data_pagamento: string` ao tipo do estado `pagamentos` (default: data de hoje `new Date().toISOString().split('T')[0]`)
- Renderizar um `<Input type="date">` com label "Data Pagamento" dentro do grid de cada pagamento (ao lado do campo valor)
- No `handleSave`, incluir `data_pagamento` no insert de `servicos_pagamentos`
- Na edição, carregar `data_pagamento` dos registros existentes

### 3. `ServiceViewDialog.tsx` — exibição

- Mostrar a data de pagamento formatada ao lado de cada pagamento na visualização do serviço

### Arquivos modificados
- Nova migration: coluna `data_pagamento`
- `src/components/services/ServiceDialog.tsx`
- `src/components/services/ServiceViewDialog.tsx`

