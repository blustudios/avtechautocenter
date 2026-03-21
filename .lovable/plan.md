

## Plano: Fix "Sem Placa" não salvar marca/modelo + mover checkbox

### Problema
Quando `semPlaca=true`, a linha 192 (`if (!semPlaca && quickCar.placa.trim())`) pula toda a lógica de salvar o carro. Como `carros` usa `placa` como PK, não há como inserir um carro sem placa nessa tabela. Resultado: marca e modelo são perdidos.

### Solução

#### 1. Migration — colunas `carro_marca` e `carro_modelo` na tabela `servicos`
```sql
ALTER TABLE servicos ADD COLUMN carro_marca text;
ALTER TABLE servicos ADD COLUMN carro_modelo text;
```
Isso permite salvar marca/modelo diretamente no serviço, independente de ter placa ou não.

#### 2. `ServiceDialog.tsx` — lógica de save
- Quando `semPlaca=true`: salvar `carro_placa: null`, `carro_marca: quickCar.marca`, `carro_modelo: quickCar.modelo` no serviço
- Quando `semPlaca=false` e placa preenchida: continuar upsert no `carros` + salvar placa, marca e modelo no serviço
- Na edição: carregar `carro_marca`/`carro_modelo` do serviço para preencher `quickCar` quando não há placa

#### 3. UI — mover checkbox abaixo do campo Placa
- Remover o checkbox de dentro do `<div>` do label da placa
- Colocar abaixo do `<Input>` da placa como uma linha separada com `flex items-center gap-1.5 mt-1.5`
- Layout limpo: Label → Input → Checkbox abaixo

#### 4. Exibição — `ServiceViewDialog.tsx`
- Mostrar marca/modelo do serviço mesmo quando não há placa (usar `carro_marca`/`carro_modelo` do serviço)

### Arquivos modificados
- Nova migration: colunas `carro_marca`, `carro_modelo` em `servicos`
- `src/components/services/ServiceDialog.tsx` — save + load + UI
- `src/components/services/ServiceViewDialog.tsx` — exibição

