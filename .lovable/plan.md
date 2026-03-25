

## Plano: Incluir `data_orcamento` no filtro de datas e exibição

### Problema
Orçamentos salvos não aparecem na lista porque o filtro de período não considera o campo `data_orcamento`. Se um orçamento foi criado no mês atual mas não tem `data_entrada` relevante, ele fica invisível.

### Alterações em `src/pages/Servicos.tsx`

1. **Interface `Servico`** (linha 24): adicionar `data_orcamento?: string;`

2. **Filtro de datas** (linhas 135-140): adicionar `data_orcamento` ao array `allDates`:
```ts
if (s.data_orcamento) allDates.push(startOfDay(new Date(s.data_orcamento + 'T00:00:00')));
```

Isso garante que a lógica multi-data existente (que já considera `data_entrada`, `data_encerramento` e datas de pagamento) também inclua a data do orçamento na verificação do período.

### Arquivo modificado
- `src/pages/Servicos.tsx`

