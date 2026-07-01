## Objetivo
Ao filtrar por status **"Em Progresso"** na página **Entradas de Serviço**, ignorar o filtro de período (preset/personalizado) para que TODOS os serviços em progresso apareçam, inclusive os iniciados em meses anteriores.

## Comportamento proposto
- Quando `statusFilter === 'em_progresso'`:
  - A query ignora `dateFrom`/`dateTo` (e o preset de período) sobre `data_entrada`/`data_encerramento`/`data_orcamento`.
  - Os filtros de **data de pagamento** e **tipo de pagamento** continuam funcionando normalmente (caso o usuário queira refinar).
  - Na UI, os seletores de "Período" ficam **desabilitados** com um pequeno aviso: *"Período ignorado ao filtrar por Em Progresso"*, para deixar claro por que o filtro não está sendo aplicado.
- Para os demais status (`all`, `orcamento`, `finalizado`, `cancelado`), o filtro de período segue como está hoje.

## Alterações técnicas
Arquivo único: `src/pages/Servicos.tsx`
1. No bloco de montagem da query (após a linha 116), envolver a aplicação do filtro de data com `if (statusFilter !== 'em_progresso') { ... }`.
2. Passar essa condição também ao `getDateRange` para não usar `datePreset` quando em progresso.
3. Na UI (área dos selects de período, ~linha 269+), aplicar `disabled` nos controles de período quando `statusFilter === 'em_progresso'` e exibir texto auxiliar.

## Justificativa
É a solução mais simples e alinhada ao caso de uso descrito: serviços "Em Progresso" são, por definição, pendências abertas — não faz sentido escondê-los por corte de data. Manter os demais filtros ativos preserva flexibilidade sem esconder informação crítica.