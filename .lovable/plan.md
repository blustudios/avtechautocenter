

## Plano: Filtro de período multi-data na tela de Serviços

### Problema atual
O filtro de período considera apenas `data_entrada`. Serviços com datas em meses diferentes (entrada em fev, saída/pagamento em mar) desaparecem ao filtrar por um dos meses.

### Solução
Alterar a lógica de `matchDate` para considerar **todas as datas** do serviço: `data_entrada`, `data_encerramento` (saída), e todas as `data_pagamento` dos pagamentos. Se **qualquer** dessas datas cair dentro do período filtrado, o serviço aparece na lista.

### Alterações em `src/pages/Servicos.tsx`

1. **Interface `Servico`**: adicionar `data_encerramento?: string` (já existe no banco mas não está no select).

2. **`fetchServicos`**: já busca `*` (inclui `data_encerramento`), então basta garantir que o campo está mapeado.

3. **Lógica `matchDate`** (linhas 129-134): substituir a verificação atual que só olha `data_entrada` por uma que coleta todas as datas do serviço e verifica se ao menos uma está dentro do range:

```ts
let matchDate = true;
if (from || to) {
  const allDates: Date[] = [];
  allDates.push(startOfDay(new Date(s.data_entrada + 'T00:00:00')));
  if (s.data_encerramento) {
    allDates.push(startOfDay(new Date(s.data_encerramento + 'T00:00:00')));
  }
  (s.pagamentos || []).forEach(p => {
    if (p.data_pagamento) {
      allDates.push(startOfDay(new Date(p.data_pagamento + 'T00:00:00')));
    }
  });
  const f = from ? startOfDay(from) : null;
  const t = to ? startOfDay(to) : null;
  matchDate = allDates.some(d => {
    if (f && isBefore(d, f)) return false;
    if (t && isAfter(d, t)) return false;
    return true;
  });
}
```

### Arquivo modificado
- `src/pages/Servicos.tsx` — lógica de filtro de período + interface

