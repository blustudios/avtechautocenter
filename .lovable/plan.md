

## Plano: Reformulação visual e lógica dos Pagamentos nos Serviços

### Resumo
Reorganizar a UI da seção de pagamentos com layout limpo e compacto, adicionar checkbox "Pago" por pagamento, e automatizar o status de pagamento com 4 novos estados baseados em regras de data e marcação.

---

### 1. Migration — nova coluna `pago` em `servicos_pagamentos`

```sql
ALTER TABLE servicos_pagamentos ADD COLUMN pago boolean NOT NULL DEFAULT false;
```

### 2. Novos status de pagamento

**`src/lib/format.ts`** — atualizar `paymentStatusLabels`:
```ts
export const paymentStatusLabels: Record<string, string> = {
  pendente: 'Pendente Pagamento',
  pendente_parcial: 'Pendente Parcial',
  em_atraso: 'Pagamento Em Atraso',
  pago: 'Pago',
};
```

**`src/components/StatusBadge.tsx`** — adicionar estilos para os novos status:
- `pendente` — amarelo (atual)
- `pendente_parcial` — laranja (usar `--status-parcial`)
- `em_atraso` — vermelho (`destructive`)
- `pago` — verde (atual)

### 3. `ServiceDialog.tsx` — Seção de Pagamentos

**Visual — layout compacto e reordenado:**
- Pagamentos iniciam ocultos (array vazio `[]`). Botão "+ Adicionar Pagamento" visível por padrão
- Cada pagamento em uma linha compacta, ordem dos campos: **Maquininha → Tipo → Bandeira (se aplicável) → Parcelas (se aplicável) → Valor → Data Pagamento**
- Checkbox circular "Pago" alinhado à direita de cada pagamento com label
- Botão remover ao lado do checkbox
- Novo campo `pago: boolean` no estado de pagamentos (default `false`)

**Lógica — cálculo automático do `status_pagamento`:**
- Função `calcPaymentStatus(pagamentos)` que retorna o status baseado nas regras:
  - **Pago**: todos os checkboxes marcados
  - **Pagamento Em Atraso**: algum pagamento sem checkbox E com `data_pagamento` anterior a hoje
  - **Pendente Parcial**: mais de 1 pagamento, ao menos 1 marcado, demais com data >= hoje
  - **Pendente Pagamento**: sem pagamentos, ou pagamentos não marcados com data >= hoje
- Prioridade: `em_atraso` > `pendente_parcial` > `pendente` > `pago`
- Remover o `Select` manual de status de pagamento do Resumo (seção inferior)
- O status é calculado automaticamente e salvo no `handleSave`

**Save:**
- Incluir campo `pago` no insert de `servicos_pagamentos`
- Na edição, carregar `pago` dos registros existentes

### 4. Exibição — `StatusBadge` e `Servicos.tsx`

- `PaymentBadge` renderiza os 4 status com cores adequadas
- Remover `SelectItem` de status_pagamento do `ServiceDialog` (seção Resumo) — exibir apenas o badge calculado como informativo

### 5. `ServiceViewDialog.tsx`

- Exibir indicação "Pago" ou "Pendente" por pagamento na visualização

---

### Arquivos modificados
- **Nova migration**: coluna `pago` em `servicos_pagamentos`
- **`src/lib/format.ts`**: novos labels de status
- **`src/components/StatusBadge.tsx`**: novos estilos
- **`src/components/services/ServiceDialog.tsx`**: UI + lógica automática
- **`src/components/services/ServiceViewDialog.tsx`**: exibição do status por pagamento

