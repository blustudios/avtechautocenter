

## Plano: Botao "Salvar + Orcamento" no cadastro de cliente

### Contexto

Existem dois locais de cadastro de cliente:
1. **`ClientDialog`** (`src/components/clients/ClientDialog.tsx`) — usado na pagina de Servicos
2. **Formulario inline** em `src/pages/Clientes.tsx` — usado na pagina de Clientes

Ambos precisam do novo botao.

### Alteracoes

#### 1. `src/components/clients/ClientDialog.tsx`

**Props**: Adicionar `onSaveAndOrcamento?: () => void`

**Botao**: Adicionar entre "Cancelar" e "Salvar + Servico" um novo botao:
```tsx
<Button variant="outline" onClick={() => save('orcamento')}
  className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10">
  Salvar + Orçamento
</Button>
```

**Logica `save`**: Alterar parametro de `boolean` para `string` (`'service' | 'orcamento' | undefined`). Quando `'orcamento'`, chamar `onSaveAndOrcamento()`.

Sempre exibir este botao (sem condicional de prop), ja que o botao sempre deve estar disponivel.

#### 2. `src/pages/Clientes.tsx`

**Estado**: Adicionar `orcamentoForCpf` similar a `serviceForCpf`:
```ts
const [orcamentoForCpf, setOrcamentoForCpf] = useState<string | null>(null);
```

**Botao no formulario inline** (linha 410-416): Adicionar botao "Salvar + Orcamento" com estilo azul, visivel apenas para novos clientes (`!editCpf`):
```tsx
<Button variant="outline" onClick={() => saveClient(false, true)}
  className="w-full sm:w-auto border-blue-500/50 text-blue-500 hover:bg-blue-500/10">
  <ClipboardList className="w-4 h-4 mr-2" /> Salvar + Orçamento
</Button>
```

**Logica `saveClient`**: Adicionar segundo parametro `openOrcamento = false`. No final do save, quando `openOrcamento`, setar `setOrcamentoForCpf(formatted)`.

**Renderizar ServiceDialog para orcamento** (junto ao bloco do `serviceForCpf`):
```tsx
{orcamentoForCpf && (
  <ServiceDialog
    open={!!orcamentoForCpf}
    defaultClienteCpf={orcamentoForCpf}
    initialStatus="orcamento"
    onClose={() => { setOrcamentoForCpf(null); }}
  />
)}
```

#### 3. `src/pages/Servicos.tsx`

Na instancia do `ClientDialog`, adicionar prop `onSaveAndOrcamento` que fecha o dialog do cliente e abre o `ServiceDialog` com `initialStatus="orcamento"`.

### Arquivos modificados
- `src/components/clients/ClientDialog.tsx` — nova prop + botao + logica save
- `src/pages/Clientes.tsx` — botao, estado, ServiceDialog com orcamento
- `src/pages/Servicos.tsx` — prop `onSaveAndOrcamento` no ClientDialog

