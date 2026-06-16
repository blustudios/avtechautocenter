# Plano: Botões de Saída em Todos os Popups

## Problema
Após removermos o "X" e o fechamento por clique fora / ESC, alguns dialogs ficaram **sem nenhuma forma de saída**. O exemplo principal é a primeira janela ao clicar num card de Serviço (`ServiceViewDialog`) nos status `orçamento` e `em progresso`.

## Mapeamento — dialogs sem botão de saída

| Dialog | Status | Ação |
|---|---|---|
| `ServiceViewDialog` (orçamento) | sem Fechar | Adicionar **Fechar** |
| `ServiceViewDialog` (em_progresso) | sem Fechar | Adicionar **Fechar** |
| `ServiceViewDialog` (cancelado/finalizado) | já tem | — |
| `PneuSelectorDialog` | sem Cancelar no nível do dialog | Adicionar **Cancelar** no rodapé |
| `Clientes` → "viewClient" dialog | só botão "Editar Cliente" | Adicionar **Fechar** |
| `Clientes` → "Linked services" dialog | nenhum | Adicionar **Fechar** |
| `Configuracoes` → "Importar XML" dialog | nenhum | Adicionar **Cancelar** |
| `HistoryDialog`, `EntryTypeDialog` | já corrigidos na rodada anterior | — |
| Demais (`ServiceDialog`, `ClientDialog`, `AssignClientDialog`, `EditPagamento`, `EditCusto`, `Estoque`, `Fornecedores`, `Configuracoes` form, `Clientes` form) | já têm Cancelar | — |
| `AlertDialog`s | sempre têm `AlertDialogCancel` | — |

## Implementação

### 1. `ServiceViewDialog.tsx`
- Branch `orcamento` (linhas 174-192): adicionar botão **Fechar** outline na linha de ações principais (junto a Baixar/Editar/Executar). Manter "Cancelar Orçamento" destrutivo abaixo.
- Branch `em_progresso` (linhas 205-227): adicionar botão **Fechar** outline ao lado de Excluir / Atribuir Cliente.

### 2. `PneuSelectorDialog.tsx`
- Adicionar `DialogFooter` com botão **Cancelar** que chama `onClose()` (ao final do `space-y-4`, antes do fechamento do `DialogContent`).

### 3. `Clientes.tsx`
- Dialog `viewClient` (linha 493): adicionar **Fechar** (outline) ao lado de "Editar Cliente".
- Dialog `linkedServices` (linha 556): adicionar `DialogFooter` com **Fechar**.

### 4. `Configuracoes.tsx`
- Dialog `showXmlImport` (linha 497): adicionar `DialogFooter` com **Cancelar** que fecha (`setShowXmlImport(false)`).

## Notas
- Todos os botões usam `variant="outline"` e label "Fechar" (read-only/visualização) ou "Cancelar" (formulários/seletores).
- Nenhuma lógica de negócio é tocada — apenas presentation.
