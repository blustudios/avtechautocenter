

## Plano: Corrigir exibição de Serviços Rápidos existentes

### Causa raiz

Os serviços rápidos existentes no banco têm **dois problemas**:

1. `is_servico_rapido = false` — o campo foi adicionado depois que esses serviços já existiam
2. Dados do veículo estão em `carro_marca`/`carro_modelo` (campos legados) e NÃO em `carro_marca_livre`/`carro_modelo_livre`/`carro_placa_livre`

Resultado: ao editar, a condição `form.is_servico_rapido && !form.cliente_cpf` é falsa, então mostra campos de cliente/carro normais (vazios).

### Correções

#### 1. Migração SQL: corrigir dados existentes

```sql
UPDATE servicos
SET is_servico_rapido = true,
    carro_marca_livre = carro_marca,
    carro_modelo_livre = carro_modelo,
    carro_placa_livre = carro_placa
WHERE cliente_cpf IS NULL
  AND is_servico_rapido = false
  AND carro_marca IS NOT NULL;
```

Isso atualiza todos os serviços que claramente são "rápidos" (sem cliente, com marca preenchida) para terem os campos corretos.

#### 2. Fallback no carregamento do form (`ServiceDialog.tsx`)

Na inicialização do form (linhas 107-122), adicionar fallback para ler de `carro_marca` se `carro_marca_livre` estiver vazio:

```ts
carro_marca_livre: sv.carro_marca_livre || sv.carro_marca || '',
carro_modelo_livre: sv.carro_modelo_livre || sv.carro_modelo || '',
carro_placa_livre: sv.carro_placa_livre || sv.carro_placa || '',
```

E inferir `is_servico_rapido` quando os dados indicam que é um serviço rápido:

```ts
is_servico_rapido: sv.is_servico_rapido || (!sv.cliente_cpf && !!sv.carro_marca),
```

### Arquivos modificados
- **Migração SQL** — corrigir dados existentes no banco
- **`src/components/services/ServiceDialog.tsx`** — fallback no carregamento (4 linhas)

