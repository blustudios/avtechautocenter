

## Plano: Carro no Serviço Rápido + Detecção de placa duplicada

### O que muda

#### 1. `ServiceDialog.tsx` — Campos de carro no Serviço Rápido
- Quando `quickMode=true` (criação) ou editando serviço rápido sem cliente:
  - Adicionar campos inline de **Marca**, **Modelo** e **Placa** (inputs diretos, sem dropdown)
  - Novo estado `quickCar: { marca, modelo, placa }` para armazenar os dados
- No `handleSave`:
  - Se `quickCar.placa` preenchida, fazer upsert na tabela `carros` com `cliente_cpf` vazio (usar um valor especial como string vazia ou null — precisa de ajuste, ver abaixo)
  - Salvar `carro_placa` no serviço com a placa informada
- **Problema**: `carros.cliente_cpf` é NOT NULL. Precisa de uma migration para torná-lo nullable.

#### 2. Migration — `carros.cliente_cpf` nullable
```sql
ALTER TABLE carros ALTER COLUMN cliente_cpf DROP NOT NULL;
```
Isso permite carros sem dono (cadastrados via Serviço Rápido).

#### 3. `ServiceDialog.tsx` — Ao usar "Atribuir Cliente"
- Quando o usuário atribui um cliente a um serviço rápido que tem carro, atualizar `carros.cliente_cpf` com o CPF do cliente selecionado

#### 4. `Clientes.tsx` — Detecção de placa duplicada ao cadastrar carro
- No `saveClient` (e na lógica de salvar carros), antes de inserir um novo carro:
  - Verificar se já existe um carro com aquela placa e `cliente_cpf IS NULL`
  - Se existir, mostrar `AlertDialog`: "Carro já cadastrado no sistema, deseja adicioná-lo a este cliente?"
  - Se "Sim": fazer `UPDATE carros SET cliente_cpf = ? WHERE placa = ?`
  - Se "Não": não salvar aquele carro (ou permitir criar novo com a mesma placa — depende da PK, placa é PK então não pode duplicar → apenas atualizar)
- Como `placa` é PK, não pode haver duplicata. Então o fluxo é:
  - Tentar inserir → se erro de conflito (placa já existe) → verificar se o carro existente tem `cliente_cpf IS NULL` → popup → update

### Arquivos modificados
- `src/components/services/ServiceDialog.tsx` — campos de carro no quick mode, lógica de salvar carro sem cliente
- `src/pages/Clientes.tsx` — detecção de placa duplicada com popup de confirmação
- Migration: `ALTER TABLE carros ALTER COLUMN cliente_cpf DROP NOT NULL`

### Detalhes de implementação

**ServiceDialog quick car fields**: 3 inputs (Marca, Modelo, Placa) mostrados quando `quickMode` ou serviço rápido em edição. Na edição, carregar dados do carro vinculado se existir. No save, inserir/upsert o carro com `cliente_cpf: null`.

**Clientes popup**: Usar `AlertDialog` com estado `pendingCarPlaca` para controlar a placa em conflito. Ao confirmar, update o `cliente_cpf` do carro existente.

