

## Plano: Preencher campo Cliente no ServiceDialog apos salvar cliente

### Problema

Os callbacks `onSaveAndService` e `onSaveAndOrcamento` do `ClientDialog` nao passam o CPF do cliente recem-criado. Em `Servicos.tsx`, o `showCreate` e aberto sem `clientCpf`, entao o ServiceDialog abre com o campo cliente vazio.

### Alteracoes

#### 1. `src/components/clients/ClientDialog.tsx`

Alterar as props de callback para receber o CPF:
```ts
onSaveAndService?: (cpf: string) => void;
onSaveAndOrcamento?: (cpf: string) => void;
```

Na funcao `save`, passar o CPF formatado ao chamar os callbacks:
```ts
if (action === 'service' && onSaveAndService) onSaveAndService(formatted);
else if (action === 'orcamento' && onSaveAndOrcamento) onSaveAndOrcamento(formatted);
```

#### 2. `src/pages/Servicos.tsx`

Atualizar os callbacks do `ClientDialog` para capturar o CPF:

```tsx
onSaveAndService={(cpf) => {
  setShowNewClient(false);
  setLastCreatedClientCpf(cpf);
  setShowClientEntryType(true);
}}
onSaveAndOrcamento={(cpf) => {
  setShowNewClient(false);
  setShowCreate({ status: 'orcamento', clientCpf: cpf });
}}
```

#### 3. `src/pages/Clientes.tsx`

Verificar se os callbacks do `ClientDialog` (se usado aqui) tambem precisam de ajuste — ja esta correto pois `Clientes.tsx` usa `serviceForCpf`/`orcamentoForCpf` diretamente no `saveClient` com o CPF formatado.

### Arquivos modificados
- `src/components/clients/ClientDialog.tsx` — callbacks passam CPF
- `src/pages/Servicos.tsx` — callbacks recebem e usam CPF

