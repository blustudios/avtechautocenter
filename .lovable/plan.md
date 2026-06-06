# Plano: Melhorias no Relatório de Pagamentos

Duas funcionalidades novas na página `/relatorios/pagamentos`, mantendo o padrão visual já existente.

---

## 1. Botão "Buscar erros"

**Objetivo:** identificar pagamentos com dados inconsistentes — tipo de pagamento que exige Maquininha/Bandeira mas o campo está vazio.

### Regras (mesmas do `ServiceDialog`)

- `needsMaquininha`: tipo ≠ `Pix CNPJ`, `Dinheiro`, `A Definir` → exige `maquininha_id`.
- `needsBandeira`: tipo ≠ `Pix CNPJ`, `Dinheiro`, `Pix Máquina`, `A Definir` → exige `bandeira_id`.
- Também sinaliza: `Crédito Parcelado` sem `parcelas`, `tipo = A Definir` em pagamentos já marcados como `pago`.

### UX

- Botão novo no header (ao lado de Exportar/Atualizar), ícone `AlertTriangle`, label **"Buscar erros"**.
- Ao clicar: ativa **modo de auditoria** — substitui os filtros normais por um banner laranja "Mostrando X pagamentos com inconsistências" e um botão "Limpar auditoria".
- Aplica filtro client-side adicional após o fetch normal? Não — para garantir cobertura, **roda uma query dedicada** ignorando os filtros de período/maquininha/bandeira (ou opcional: aplica respeitando filtros — ver pergunta abaixo).
- Cada linha mostra um chip vermelho com o(s) campo(s) faltantes (ex.: "Sem Maquininha", "Sem Bandeira").
- Resumo de KPIs é substituído por: "Total com erro", "Sem Maquininha", "Sem Bandeira", "Outros".

### Implementação técnica

- Query Supabase com `.or(...)` direto no PostgREST:
  ```
  .not('tipo','in','("Pix CNPJ","Dinheiro","A Definir")')
  .is('maquininha_id', null)
  ```
  Combinado com segunda query para `bandeira_id` nulo (filtrando os tipos que exigem) — fazemos duas queries em paralelo e unimos por `id`, ou uma única query trazendo um conjunto maior e filtrando os tipos no client (mais simples, dado o volume pequeno esperado).
- Paginação mantida (25/página); count exato.
- Sem necessidade de migration nova — toda a lógica é client-side + queries simples.

---

## 2. Edição inline de pagamento

**Objetivo:** abrir um dialog para editar um pagamento direto do relatório, com a mesma UI da seção de pagamentos do `ServiceDialog`.

### UX

- Novo ícone `Pencil` em cada linha (desktop tabela + cards mobile), ao lado do "Ver serviço".
- Abre um `**Dialog**` com título "Editar pagamento — Serviço {id}".
- Layout idêntico à linha de pagamento em `ServiceDialog.tsx` (linhas 725–770):
  - Select Tipo (lista `tiposPagamento`)
  - Select Maquininha (condicional `needsMaquininha`)
  - Select Bandeira (condicional `needsBandeira`, dependente da maquininha)
  - Input Parcelas (apenas Crédito Parcelado)
  - `CurrencyInput` Valor
  - Input Data
  - Checkbox "Pago"
- Mostra **Taxa aplicada** recalculada em tempo real (usando a mesma função `getTaxRate` extraída para um helper reutilizável `src/lib/payments.ts`).
- Botões: **Cancelar** / **Salvar**.

### Persistência e efeitos colaterais

Atualizar um pagamento muda o status de pagamento do serviço pai. Para manter consistência com o `ServiceDialog`:

1. `UPDATE servicos_pagamentos` com os novos campos + `taxa_aplicada` recalculada.
2. Recarregar todos os pagamentos daquele `servico_id` e recalcular `status_pagamento` (mesma função `calcPaymentStatus` — extrair para `src/lib/payments.ts`):
  - todos pagos → `pago`
  - algum em atraso (não pago e `data_pagamento < hoje`) → `em_atraso`
  - misto → `pendente_parcial`
  - default → `pendente`
3. `UPDATE servicos SET status_pagamento` se mudou.
4. Registrar entrada em `servicos_historico` ("Pagamento editado via Relatório") — mantém auditoria.
5. Invalidar queries: `['relatorio-pagamentos', ...]`, `['relatorio-pagamentos-resumo', ...]`, e (se aberta em outra aba) `['servicos']`.

**Validações no submit** (toast de erro, sem fechar dialog):

- Tipo obrigatório.
- Valor > 0.
- `needsMaquininha` → maquininha obrigatória.
- `needsBandeira` → bandeira obrigatória.
- `Crédito Parcelado` → parcelas ≥ 1.
- Se `pago = true` → data obrigatória.

---

## Extração de helpers (`src/lib/payments.ts`)

Para evitar duplicação entre `ServiceDialog` e o novo dialog:

```ts
export const needsMaquininha = (tipo) => ...
export const needsBandeira = (tipo) => ...
export const getTaxRate = (tipo, maquininha_id, bandeira_id, parcelas, maquininhas, taxas) => ...
export const calcPaymentStatus = (pagamentos) => ...
export const validatePagamento = (p) => string[]  // mensagens de erro
```

`ServiceDialog.tsx` passa a importar daí (substituição mínima, sem mudar comportamento).

---

## Arquivos

**Novos**

- `src/lib/payments.ts` — helpers compartilhados.
- `src/components/relatorios/EditPagamentoDialog.tsx` — dialog de edição.

**Editados**

- `src/pages/relatorios/Pagamentos.tsx` — botão "Buscar erros", coluna de ações com ícone editar, integração do dialog, modo auditoria.
- `src/components/services/ServiceDialog.tsx` — usar helpers do novo módulo (refactor sem mudança de comportamento).

**Sem migration.** RPC `relatorio_pagamentos_resumo` permanece como está.

---

## Confirmações:

1. O **"Buscar erros"** deve varrer **todos os pagamentos** independente dos filtros.
2. Quando salvar a edição, devo **recalcular o `status_pagamento` do serviço** automaticamente (como o `ServiceDialog` faz).
3. Registrar a edição no `servicos_historico` *com campo* `"pagamento_editado_relatorio"`*.*