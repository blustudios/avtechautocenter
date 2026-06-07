## Objetivo

Permitir editar um custo diretamente no **Relatório de Custos**, sem reabrir o serviço, com layout idêntico ao card de "Custos" do `ServiceDialog` (print de referência).

## Mudanças

### 1. Novo componente `src/components/relatorios/EditCustoDialog.tsx`

Dialog que reproduz fielmente o card de Custos do `ServiceDialog.tsx` (linhas 658–706):

- Header com `ClipboardList` + título "Custo" no estilo `SectionTitle`.
- Card interno com:
  - Linha 1 (grid 2 cols): `Item` (Input) + `Fornecedor` (Select, lista de `fornecedores`).
  - Linha 2 (grid 3 cols): `Quantidade` (number), `Valor` (CurrencyInput RTL), `Data de compra` (date — botão "+ data de compra" quando vazia, igual ao padrão atual).
- Mesmos estilos `bg-card/bg-background border-border`.
- Botões `Cancelar` e `Salvar` no footer.

Props: `{ custoId: string | null; open: boolean; onClose(): void; onSaved(): void; }`

Comportamento:

- Ao abrir: carrega o custo via `select` em `servicos_custos` + lista de `fornecedores` (cache simples via `useEffect`).
- Validação: `item` obrigatório, `quantidade > 0`, `valor >= 0`. Data opcional (mesma regra do ServiceDialog).
- Salvar:
  1. `UPDATE servicos_pagamentos` … na verdade `UPDATE servicos_custos` com os novos campos (`item`, `quantidade`, `valor`, `fornecedor_id` (null se vazio), `data_compra` (null se vazio)).
  2. **Recalcular `custo_total` e `lucro_liquido` do serviço** (somar todos `servicos_custos` do `servico_id` → atualizar `servicos.custo_total` e `lucro_liquido = valor_liquido - custo_total`, ignorando recálculo se status = `orcamento`, igual à lógica do ServiceDialog linhas 219–225/274–275).
  3. Log em `servicos_historico` (um registro por campo alterado, padrão `campo: 'custo:<id>:<field>'`, `valor_anterior`/`valor_novo`).
- Toast de sucesso, fechar dialog, chamar `onSaved()` para refrescar a lista e o resumo.

### 2. Edição em `src/pages/relatorios/Custos.tsx`

- Importar `Pencil` de lucide-react e o novo `EditCustoDialog`.
- Estado `const [editCustoId, setEditCustoId] = useState<string | null>(null);`.
- **Tabela desktop**: adicionar coluna "Ações" no final com botão ícone `Pencil` (ghost, size sm) → `setEditCustoId(r.id)`.
- **Cards mobile**: adicionar botão `Pencil` ao lado do link do serviço (na div já existente `flex items-center justify-between`).
- Renderizar `<EditCustoDialog custoId={editCustoId} open={!!editCustoId} onClose={() => setEditCustoId(null)} onSaved={() => { fetchData(); fetchResumo(); }} />`.

### 3. Sem migração de banco

Tudo é feito com SELECT/UPDATE/INSERT em tabelas existentes (`servicos_custos`, `servicos`, `servicos_historico`, `fornecedores`).

## Arquivos

- **Criar**: `src/components/relatorios/EditCustoDialog.tsx`
- **Editar**: `src/pages/relatorios/Custos.tsx`

## Pontos a confirmar

1. **Recálculo do serviço**: ao salvar, devo recalcular `custo_total` e `lucro_liquido` do serviço pai (como o ServiceDialog faz) — confirma? Sim
2. **Histórico**: registrar a alteração em `servicos_historico` — confirma? Sim
3. Mantemos a mesma validação do ServiceDialog (data de compra obrigatória apenas se o serviço NÃO for `orcamento`)? Sim