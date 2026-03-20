

## Plano: Melhorias em Clientes + Serviços

### 3 features combinadas

**A. "Salvar + Serviço" no dialog de Novo Cliente (`Clientes.tsx`)**
- Adicionar estado `serviceForCpf` (string | null)
- Novo botão "Salvar + Serviço" no footer do dialog — chama `saveClient`, e no sucesso seta `serviceForCpf`
- Renderizar `<ServiceDialog>` com nova prop `defaultClienteCpf`
- Footer responsivo: `flex-col sm:flex-row`

**B. "Adicionar Serviço" no dropdown "..." do cliente (`Clientes.tsx`)**
- Adicionar item `DropdownMenuItem` com ícone `Wrench` e texto "Adicionar Serviço"
- Ao clicar, seta `serviceForCpf` com o CPF do cliente → abre ServiceDialog pré-preenchido

**C. Menu "..." nos cards de serviço + Excluir com confirmação**

1. **`Servicos.tsx`** — em cada card de serviço:
   - Adicionar botão `MoreHorizontal` com `DropdownMenu` contendo "Editar" e "Excluir"
   - `e.stopPropagation()` para não abrir o view dialog
   - "Editar" → seta `editService`
   - "Excluir" → abre dialog de confirmação

2. **`Servicos.tsx`** — AlertDialog de confirmação:
   - Estado `deleteServiceId` (string | null)
   - Mensagem: "Deseja excluir essa entrada permanentemente?"
   - Botões "Não" (cancel) e "Sim" (confirm)
   - Ao confirmar: deleta `servicos_itens`, `servicos_pagamentos`, `servicos_custos` e `servicos` pelo id, depois refresh

3. **`ServiceDialog.tsx`** — botão "Excluir" no footer (apenas no modo edição):
   - Adicionar `AlertDialog` interno com mesma confirmação
   - Função `handleDelete` que deleta as tabelas filhas + serviço e chama `onClose`
   - Botão vermelho `variant="destructive"` alinhado à esquerda no footer

**D. `ServiceDialog.tsx` — nova prop `defaultClienteCpf`**
- Prop opcional na interface `Props`
- No `useEffect` de inicialização, se `defaultClienteCpf` e não `isEdit`, setar `form.cliente_cpf`

### Arquivos modificados
- `src/pages/Clientes.tsx` — features A e B
- `src/pages/Servicos.tsx` — feature C (dropdown + AlertDialog)
- `src/components/services/ServiceDialog.tsx` — feature C (botão excluir) + feature D (prop defaultClienteCpf)

### Imports adicionais necessários
- `Servicos.tsx`: `MoreHorizontal, Pencil, Trash2` do lucide, `DropdownMenu*`, `AlertDialog*`
- `ServiceDialog.tsx`: `AlertDialog*`, `Trash2`
- `Clientes.tsx`: `Wrench` do lucide, `ServiceDialog`

