## Objetivo

Garantir que, ao criar ou editar um cliente, o campo `nome` seja automaticamente formatado em **Nome Próprio** (Title Case), independentemente de como o usuário digitou.

## Escopo

Esta melhoria atinge **todos os pontos de entrada e edição** de clientes no sistema.

## Alterações Propostas

### 1. Utilitário `formatNomeProprio`

Criar em `src/lib/format.ts` a função:

```typescript
export function formatNomeProprio(nome: string): string {
  const preposicoes = ['de', 'do', 'dos', 'da', 'das', 'e'];
  return nome
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((palavra, i) => {
      if (i === 0 || !preposicoes.includes(palavra)) {
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      }
      return palavra;
    })
    .join(' ');
}
```

Comportamento esperado:

- `"joão da silva"` → `"João da Silva"`
- `"MARIA DOS SANTOS"` → `"Maria dos Santos"`
- `"  pedro   e   paulo  "` → `"Pedro e Paulo"`
- `"Ana De Souza"` → `"Ana de Souza"` (preposição no meio em minúscula)

### 2. Aplicação no ponto de criação (modal)

Em `src/components/clients/ClientDialog.tsx`, na função `save`, formatar o nome **antes do `insert**`:

```typescript
const { error } = await supabase.from('clientes').insert({
  cpf: formatted,
  nome: formatNomeProprio(form.nome),
  email: form.email,
  whatsapp: form.whatsapp,
});
```

### 3. Aplicação no ponto de criação e edição (página)

Em `src/pages/Clientes.tsx`, na função `saveClient`, formatar o nome **antes do `insert`/`update**`:

```typescript
const data = {
  cpf: formatted,
  nome: formatNomeProprio(form.nome),
  email: form.email,
  whatsapp: form.whatsapp,
};
```

### 4. Testes manuais de validação

Após implementação, verificar:

- Criar cliente com nome todo em minúsculo
- Editar cliente com nome todo em maiúsculo
- Nomes com preposições (`da`, `dos`, `de`, `e`)
- Nomes com espaços extras

## Por que esta abordagem?

- **Centralizada:** A lógica vive em um único utilitário reutilizável (`src/lib/format.ts`), já o padrão do projeto para formatadores.
- **Não intrusiva:** A formatação acontece no momento do salvamento, não durante a digitação, evitando que o cursor "pulo" ou que o usuário seja interrompido.
- **Consistente:** Atinge tanto o modal de novo cliente (usado em fluxos rápidos) quanto a página principal de clientes (edição inclusa).
- **Culturalmente adequada:** Respeita as regras de preposições em minúsculo do português brasileiro.  
  
Orientação extra:  
Revisar e aplicar formatação a toda a base já cadastrada.