# Plano: Loader Global Automático + Dialogs Modais Estritos

## 1) Indicador de "Carregando" (>0.5s)

### Estratégia
Em vez de instrumentar cada chamada manualmente, vamos criar um **loader global automático** que detecta atividade pendente em duas frentes principais:

**A. React Query (já usado em Dashboard, Servicos etc.)**
- Usar o hook nativo `useIsFetching()` + `useIsMutating()` no `App.tsx`.
- Sempre que houver query/mutation ativa por mais de **500ms**, exibir um loader fixo.

**B. Operações imperativas (Supabase direto, sem React Query)**
- Há vários `await supabase.from(...)` espalhados (Clientes, Estoque, Fornecedores, ServiceDialog, dialogs de edição etc.).
- Criar um contexto leve `LoadingProvider` com:
  - `const { run } = useGlobalLoading();`
  - `await run(() => supabase.from('x').insert(...))` — incrementa contador, dispara timer 500ms; ao resolver, decrementa.
- Substituir progressivamente os `await` críticos por `run(...)` (saves, deletes, fetches de listas).

### Componente Visual
- `GlobalLoadingOverlay`:
  - Barra fina superior (estilo NProgress) em `hsl(var(--primary))` (laranja) — não bloqueia a UI.
  - + Pequeno badge flutuante canto inferior direito com spinner + texto "Carregando..." quando ativo >500ms.
  - Animação `fade-in` já existente no Tailwind.
- Aparece somente após **500ms** de atividade contínua, evitando flicker em respostas rápidas.

### Skeletons existentes
- Mantemos os `Skeleton` já usados nas páginas (Dashboard, Servicos) — eles continuam sendo a UX preferida em listagens. O loader global é complementar, focado em ações pontuais (salvar, excluir, refetch).

### Arquivos afetados
- `src/components/GlobalLoadingOverlay.tsx` (novo)
- `src/contexts/LoadingContext.tsx` (novo)
- `src/App.tsx` — montar overlay + provider, conectar `useIsFetching/useIsMutating`
- Adoção incremental de `run(...)` em pontos críticos: `ServiceDialog`, `ClientDialog`, `EditPagamentoDialog`, `EditCustoDialog`, `AssignClientDialog`, páginas `Clientes`/`Estoque`/`Fornecedores` (saves e deletes).

---

## 2) Dialogs: bloquear fechamento ao clicar fora e por ESC

### Estratégia
Radix UI Dialog (shadcn) expõe duas props no `DialogContent`:
- `onPointerDownOutside={(e) => e.preventDefault()}` — bloqueia clique no overlay
- `onEscapeKeyDown={(e) => e.preventDefault()}` — bloqueia tecla ESC
- Adicionalmente: remover o ícone "X" no canto superior direito (atualmente em `dialog.tsx`), já que o usuário pediu que a saída seja **somente via botão Cancelar**.

### Implementação centralizada
Editar `src/components/ui/dialog.tsx`:
1. Em `DialogContent`, adicionar por padrão:
   ```tsx
   onPointerDownOutside={(e) => e.preventDefault()}
   onInteractOutside={(e) => e.preventDefault()}
   onEscapeKeyDown={(e) => e.preventDefault()}
   ```
   Com possibilidade de override via props (para casos excepcionais como tooltips/menus internos — não afeta hoje).
2. Remover o `<DialogPrimitive.Close>` (X) do `DialogContent`.

Isso aplica a regra automaticamente em **todos** os dialogs já existentes, sem editar cada arquivo:
- ServiceDialog, ServiceViewDialog, PneuSelectorDialog, EntryTypeDialog, AssignClientDialog, HistoryDialog
- ClientDialog
- EditPagamentoDialog, EditCustoDialog
- Dialogs inline em Servicos, Clientes, Estoque, Configuracoes, Fornecedores

### Auditoria pós-mudança
- Garantir que **todo** dialog já tem botão "Cancelar" visível. Mapeamento rápido:
  - ServiceDialog ✅ — tem footer com Cancelar/Salvar
  - ClientDialog, Fornecedores, Estoque, Configuracoes ✅ — todos seguem padrão Cancelar/Salvar
  - HistoryDialog / ServiceViewDialog (read-only) — adicionar botão "Fechar" se ainda não houver
  - EntryTypeDialog (escolha de tipo) — adicionar "Cancelar"
  - AssignClientDialog ✅
- Em dialogs read-only ("Fechar" em vez de "Cancelar"), o nome do botão fica "Fechar".

### AlertDialog
- `src/components/ui/alert-dialog.tsx` já é modal-strict por natureza (Radix AlertDialog não fecha em outside-click). Sem mudança necessária.

---

## 3) Detalhes técnicos

### LoadingContext (resumo)
```ts
interface Ctx {
  run: <T>(fn: () => Promise<T>, opts?: { delay?: number }) => Promise<T>;
  isLoading: boolean; // true após delay (default 500ms)
}
```
Internamente:
- contador `pending`
- `setTimeout(500)` ao subir de 0→1; cancela ao voltar a 0 antes de disparar.

### Dialog override (resumo)
```tsx
<DialogPrimitive.Content
  onPointerDownOutside={(e) => { props.onPointerDownOutside?.(e); if (!e.defaultPrevented) e.preventDefault(); }}
  onEscapeKeyDown={(e) => { props.onEscapeKeyDown?.(e); if (!e.defaultPrevented) e.preventDefault(); }}
  ...
/>
```
Mantém extensibilidade caso algum dialog futuro precise reabrir o comportamento.

---

## 4) Ordem de execução
1. Editar `dialog.tsx` (mudança global, baixo risco) — item 2 inteiro.
2. Criar `LoadingContext` + `GlobalLoadingOverlay` e plugar no `App.tsx` — cobre 100% das React Queries automaticamente.
3. Adoção do `run(...)` nos saves/deletes imperativos mais visíveis.
4. Auditoria visual: abrir cada dialog e confirmar botão de saída.

## 5) Riscos / pontos de atenção
- Remover o "X" muda fortemente a UX — confirmar que é o desejado (o usuário disse explicitamente "única forma de sair = Cancelar").
- Loader global pode poluir se aparecer em toda navegação. O delay de 500ms mitiga; manteremos estilo discreto (barra superior + badge), não modal bloqueante.
