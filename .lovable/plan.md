## Melhoria do indicador de carregamento global

### Análise da solução proposta

A ideia de um overlay escuro centralizado é boa para deixar o estado de loading **evidente**, mas bloquear 100% da interface em **todo e qualquer fetch** seria agressivo demais — hoje o `GlobalLoadingOverlay` dispara para qualquer `useQuery`/`useMutation` ativo (inclusive refetches em segundo plano do React Query, polls, prefetch). Bloquear a tela nesses casos pioraria a UX.

**Recomendação:** combinar as duas abordagens.

- **Mutações e ações explícitas** (`useIsMutating` + chamadas via `useGlobalLoading().run(...)`) → overlay escuro central com spinner e bloqueio total de cliques. É aqui que o usuário está esperando uma resposta direta.
- **Fetches passivos** (refetches do React Query em background) → manter apenas a barrinha de progresso fina no topo, sem escurecer a tela.

Isso mantém a clareza pedida nos momentos críticos (salvar serviço, excluir, gerar recibo, login, etc.) sem travar a navegação quando o app só está atualizando dados em segundo plano.

### O que muda

**1. `src/components/GlobalLoadingOverlay.tsx**`

- Separar dois estados:
  - `blocking` = `useIsMutating() + LoadingContext.pending > 0` → renderiza overlay escuro.
  - `passive` = somente `useIsFetching() > 0` → renderiza apenas a barra de topo (mantém o badge atual opcional).
- Overlay bloqueante:
  - `fixed inset-0 z-[200]`
  - Fundo `bg-background/70 backdrop-blur-sm`
  - `pointer-events-auto` (intercepta cliques e teclas)
  - Centro: card arredondado com `Loader2` grande (`h-12 w-12 text-primary animate-spin`) + texto "Carregando...".
  - `aria-busy="true"`, `role="status"`, foco preso (simples: `tabIndex={-1}` no container) para acessibilidade.
  - Animação `animate-fade-in` ao aparecer.
- Manter `SHOW_DELAY_MS = 500` para não piscar em respostas rápidas.

**2. `src/contexts/LoadingContext.tsx**`

- Expor `pending` (número) além de `isLoading`, para o overlay diferenciar bloqueante x passivo.
- Sem mudanças na API `run()` — componentes que já usam continuam funcionando e passam a acionar o bloqueio automaticamente.

**3. Sem mudanças em telas/diálogos**

- Mutations já passam por `useIsMutating` → bloqueio automático.
- Onde houver ação async sem mutation (ex.: geração de recibo via `html2canvas`), envolver com `useGlobalLoading().run(...)` para ativar o bloqueio. Levantamento rápido em `ServiceDialog.tsx`, `Servicos.tsx` e geração de recibos durante a implementação.

### Comportamento esperado


| Situação                           | Visual                                                 |
| ---------------------------------- | ------------------------------------------------------ |
| Salvar/excluir/finalizar serviço   | Tela escurecida + spinner central, cliques bloqueados  |
| Login / logout                     | Tela escurecida + spinner central                      |
| Geração de recibo JPG              | Tela escurecida + spinner central                      |
| Refetch automático do Dashboard    | Apenas barra fina no topo                              |
| Carregamento inicial de uma página | Skeletons já existentes + barra no topo (sem bloqueio) |


### Riscos e mitigação

- **Falsos bloqueios** em refetch passivo → resolvido separando `mutating`/`run` de `fetching`.
- **Flicker** em respostas rápidas → mantido o delay de 500ms.
- **Acessibilidade** → `role="status"`, `aria-busy`, `aria-live="polite"` no container.