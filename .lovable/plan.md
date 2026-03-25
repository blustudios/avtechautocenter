

## Plano: Bug do Serviço Rápido em edição + Data de Finalização nos cards

### Bug: Edição de Serviço Rápido

**Causa raiz**: Linha 475 do `ServiceDialog.tsx` condiciona os campos livres (marca/modelo/placa) com `quickMode && !isEdit`. Quando se edita um serviço rápido, `quickMode` é `undefined` (não é passado na prop), então cai nos campos de Cliente/Carro normais.

**Correção em `src/components/services/ServiceDialog.tsx`**:

1. **Linha 475**: Trocar condição de `quickMode && !isEdit` para `form.is_servico_rapido && !form.cliente_cpf` — se o serviço é rápido E ainda não tem cliente atribuído, mostrar campos livres (marca/modelo/placa). Se já tem cliente atribuído, mostrar campos normais (cliente/carro).

2. **Adicionar botão "Atribuir Cliente"** dentro da seção Informações Gerais, visível quando `form.is_servico_rapido && !form.cliente_cpf && isEdit`. Ao clicar, abre o `AssignClientDialog` já existente. Após atribuição, recarregar os dados do serviço para trocar os campos para cliente/carro.

3. **Importar `AssignClientDialog`** e adicionar estados necessários (`showAssign`).

### Melhoria: Data de Finalização nos cards "Finalizado"

**Arquivo: `src/pages/Servicos.tsx`** — linhas 428-437

Na linha que exibe a data de entrada no card, adicionar condicionalmente a data de encerramento para serviços finalizados:

```tsx
{s.data_entrada ? ` · ${new Date(s.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
{s.status === 'finalizado' && s.data_encerramento && (
  <span className="text-muted-foreground"> → <span className="text-emerald-500/80">{new Date(s.data_encerramento + 'T00:00:00').toLocaleDateString('pt-BR')}</span></span>
)}
```

Isso mostra no formato: `Fiat Uno · ABC-1234 · 10/03/2026 → 25/03/2026` com a data de finalização em verde sutil, separada por uma seta.

### Arquivos modificados
- `src/components/services/ServiceDialog.tsx` — condição dos campos livres + botão Atribuir Cliente
- `src/pages/Servicos.tsx` — data de finalização nos cards

