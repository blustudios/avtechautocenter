

## Plano: Serviço Rápido

### O que muda

1. **`Servicos.tsx`** — Novo botão "+ Serviço Rápido" ao lado do "Novo Serviço"
   - Novo estado `showQuickCreate` (boolean)
   - Botão com cor diferenciada (secondary/outline com borda verde ou accent diferente — usar `bg-secondary border-primary/50 hover:bg-secondary/80` para destacar sem conflitar com o laranja primário)
   - Abre `ServiceDialog` com nova prop `quickMode={true}`
   - No mobile, botões empilham verticalmente (`flex-col sm:flex-row`)

2. **`ServiceDialog.tsx`** — Nova prop `quickMode?: boolean`
   - Quando `quickMode=true` e não é edição:
     - Título muda para "Serviço Rápido"
     - Campos **Cliente** e **Carro** ficam ocultos
     - `cliente_cpf` e `carro_placa` são salvos como `null`
   - Quando editando um serviço que não tem `cliente_cpf` (serviço rápido existente):
     - Detectar automaticamente `isQuickService = isEdit && !form.cliente_cpf`
     - Mostrar botão **"Atribuir Cliente"** no footer (ícone `UserPlus`)
     - Ao clicar, revela os campos Cliente e Carro dentro do formulário (toggle de estado `showClientFields`)
   - Na listagem de cards em `Servicos.tsx`, serviços sem cliente mostram "Serviço Rápido" em itálico no lugar do nome

3. **Nenhuma alteração no banco** — `cliente_cpf` e `carro_placa` já são nullable

### Arquivos modificados
- `src/pages/Servicos.tsx` — botão "+ Serviço Rápido", label no card
- `src/components/services/ServiceDialog.tsx` — prop `quickMode`, lógica de ocultar/mostrar campos, botão "Atribuir Cliente"

