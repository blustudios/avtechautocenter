

## Plano: Corrigir exclusao/cadastro de carros + campo ativo/inativo

### Problemas identificados

1. **Bug de exclusao/cadastro**: Na edicao de cliente (linha 105), o codigo faz `DELETE all cars` + `INSERT all cars`. Isso falha porque as placas ja existem na tabela (constraint de PK). Por isso nao consegue excluir carros individuais nem adicionar mais de 2.

2. **Falta verificacao de vinculo com servicos**: ao excluir um carro, nao verifica se esta vinculado a um servico.

3. **Campo ativo/inativo**: nao existe na tabela `carros`.

### Alteracoes

#### 1. Migracao de banco: adicionar coluna `ativo` a tabela `carros`

```sql
ALTER TABLE public.carros ADD COLUMN ativo boolean NOT NULL DEFAULT true;
```

#### 2. Reescrever logica de `saveClient` em `src/pages/Clientes.tsx`

Substituir a estrategia "delete all + insert all" por uma logica incremental:

- Buscar carros atuais do cliente no banco
- Comparar com `carForms`:
  - **Carros removidos** (placa no banco mas nao em carForms): verificar vinculo com `servicos.carro_placa`. Se vinculado, mostrar popup com servicos vinculados. Se nao, deletar.
  - **Carros existentes** (placa em ambos): fazer `UPDATE` com os dados do form
  - **Carros novos** (placa em carForms mas nao no banco): fazer `INSERT` (com tratamento de conflito para carros sem dono)

#### 3. Popup de carro vinculado a servico em `src/pages/Clientes.tsx`

Novo estado para controlar o dialog:
```ts
const [linkedServices, setLinkedServices] = useState<{placa: string; servicos: any[]} | null>(null);
```

Quando tentar excluir um carro vinculado:
- Buscar `servicos` onde `carro_placa = placa`
- Mostrar dialog com titulo "Impossivel excluir um carro vinculado a um Servico"
- Listar servicos com ID e status, clicaveis (navegam para `/servicos` ou abrem edicao)

#### 4. Filtrar carros inativos no `ServiceDialog.tsx`

Na query de carros (linha 161), adicionar filtro:
```ts
supabase.from('carros').select('*').eq('cliente_cpf', form.cliente_cpf).eq('ativo', true)
```

#### 5. Exibir status ativo/inativo na edicao de cliente

Adicionar um toggle (Switch) em cada card de carro no formulario de edicao, permitindo marcar como ativo/inativo. Adaptar `CarForm` para incluir `ativo: boolean`.

### Arquivos modificados
- **Migracao SQL**: adicionar coluna `ativo`
- **`src/pages/Clientes.tsx`**: reescrever saveClient, adicionar popup de servicos vinculados, toggle ativo/inativo nos carros
- **`src/components/services/ServiceDialog.tsx`**: filtrar carros inativos
- **`src/components/clients/ClientDialog.tsx`**: mesma logica se usado em outro lugar (verificar se ainda e usado)

