## Adicionar opção "Duplicar" no menu de Lançamentos

### Objetivo
No menu de 3 pontinhos de cada lançamento (Entrada/Saída) em `Financeiro`, adicionar a ação **Duplicar**, que abre o diálogo de cadastro correspondente (Entrada ou Saída) pré-preenchido com os dados da linha de origem — porém como um **novo lançamento** (sem sobrescrever o original).

### Comportamento

- **Local:** `src/components/financeiro/TabLancamentos.tsx`, no `DropdownMenu` de cada linha, entre **Editar** e **Excluir**, novo item `Duplicar`.
- **Disponibilidade:** apenas para linhas manuais (já filtradas por `!l.is_auto`, igual aos demais itens).
- **Roteamento:** se `l.tipo === 'entrada'`, abre `LancamentoEntradaDialog`; se `'saida'`, abre `LancamentoSaidaDialog`.
- **Modo do diálogo:** NÃO em modo edição (`edit` continua `null`). Em vez disso, passamos um novo prop `initial` com os valores a pré-preencher. O salvar gera um novo registro (INSERT) — sem alterar o original.

### Campos duplicados
Da linha de origem para os campos do formulário:
- `data`, `descricao` (Título), `observacoes`, `categoria_id`, `origem_id`
- `valor_previsto`, `valor_realizado`, `status_pagamento`
- (Saída) detalhes de pagamento adicionais já presentes nos campos do diálogo

### Campos NÃO duplicados
- `id`, `recorrencia_id`, `parcela_atual`, `parcela_total`, `parcela_grupo_id` — duplicação cria um lançamento avulso. Checkbox de "Parcelado" e "Recorrência" começam desmarcados (o usuário pode reativar se quiser).
- `is_auto` é sempre `false` em manuais.

### Mudanças técnicas

**1. `TabLancamentos.tsx`**
- Novo state: `duplicating: Lancamento | null`.
- Handler `onDuplicate(l)`: `setDuplicating(l)` e abre o diálogo certo (`setOpenEntrada` ou `setOpenSaida`) — mantendo `editing` em `null`.
- Novo `DropdownMenuItem` "Duplicar" entre Editar e Excluir.
- Passar `initial={duplicating?.tipo === 'saida' ? duplicating : null}` para `LancamentoSaidaDialog`, idem para entrada.
- No `onOpenChange` dos diálogos, resetar `duplicating` ao fechar.

**2. `LancamentoSaidaDialog.tsx` e `LancamentoEntradaDialog.tsx`**
- Adicionar prop opcional `initial?: Lancamento | null`.
- No `useEffect` de inicialização, prioridade: `edit` > `initial` > defaults. Quando `initial` (e `!edit`), pré-popular todos os campos listados acima, com `parcelado=false`, `recorrente=false`, `parcelaAtual=1`, `parcelaTotal=2`.
- O fluxo de salvar permanece o atual (cria novo registro), pois `edit` continua `null`.
- O título do diálogo segue "Nova Saída" / "Nova Entrada" (não exibe "Editar").

### Fora de escopo
- Não duplica grupo de parcelas nem recorrência (apenas a linha individual).
- Nenhuma mudança de schema, migration ou backend.