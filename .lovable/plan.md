## Objetivo
Adicionar botão de **excluir pneu** (ícone lixeira vermelha) no card de cada pneu da aba "Pneus" em `/estoque`, com dois fluxos de confirmação distintos dependendo se o pneu tem histórico de uso em serviços.

## Regras de negócio

**Caso A — Pneu SEM histórico em serviços** (`servicos_pneus` vazio para esse `pneu_id`):
- AlertDialog de confirmação padrão ("Excluir pneu?").
- Deleta a linha em `estoque_pneus` — o `ON DELETE CASCADE` do FK em `estoque_pneus_compras` já remove o histórico de compras automaticamente.

**Caso B — Pneu COM histórico em serviços**:
- AlertDialog com aviso claro: "Este pneu possui histórico em N serviço(s). O registro será removido do estoque, mas o histórico dos serviços será preservado."
- Deleta apenas de `estoque_pneus` (+ compras via cascade). Os registros em `servicos_pneus` ficam com `pneu_id = NULL`, exibindo os dados do pneu a partir de um snapshot denormalizado.

## Mudanças no banco de dados

Migração única:
1. Adicionar colunas snapshot em `servicos_pneus`: `marca text`, `medida_01 text`, `medida_02 text`, `aro text`, `tipo text` (nullable).
2. Backfill: preencher as novas colunas para todas as linhas existentes com base no `estoque_pneus` atual.
3. Tornar `servicos_pneus.pneu_id` nullable.
4. Recriar o FK `servicos_pneus_pneu_id_fkey` com `ON DELETE SET NULL`.
5. Atualizar inserts do app (ServiceDialog) para incluir o snapshot — feito no passo de código.

## Mudanças no código

### `src/pages/Estoque.tsx`
- Novo estado `deletePneu: Pneu | null` e um `historyCount` opcional.
- No `PneuCard`, adicionar botão `Button variant="ghost" size="icon"` com ícone `Trash2` (classe `text-destructive hover:text-destructive`), posicionado antes do botão verde "Adicionar" — ordem final: Histórico · Editar · **Excluir** · Adicionar.
- Ao clicar: fazer `SELECT count` em `servicos_pneus` filtrando por `pneu_id`. Abrir `AlertDialog` com o texto correto conforme o resultado (Caso A vs Caso B, destacando a quantidade de serviços no Caso B).
- Confirmação executa `supabase.from('estoque_pneus').delete().eq('id', pneu.id)`, toast de sucesso/erro e `fetchAll()`.
- Novo componente pequeno `DeletePneuDialog` para manter o `Estoque.tsx` legível.

### `src/components/services/ServiceDialog.tsx`
- No insert em `servicos_pneus`, incluir os campos snapshot (`marca`, `medida_01`, `medida_02`, `aro`, `tipo`) a partir do objeto de pneu selecionado.

### `src/components/services/ServiceViewDialog.tsx` e ServiceDialog (leitura)
- Ao renderizar pneus de um serviço, usar `row.estoque_pneus?.marca ?? row.marca` (e demais campos) como fallback — assim continuam aparecendo mesmo após exclusão do pneu do estoque.

## UI/UX
- Ícone `Trash2` (lucide) em vermelho (`text-destructive`) com `title="Excluir pneu"`.
- `AlertDialog` de destructive: título curto, descrição com contexto, `AlertDialogAction` com `className={buttonVariants({ variant: 'destructive' })}`.
- Caso B: destacar em destaque visual (badge/linha) "N serviço(s) com histórico deste pneu" para reforçar que os dados históricos permanecem.

## Fora do escopo
- Alteração no card de Acessórios (aba placeholder).
- Restauração/undo da exclusão.
- Exclusão em massa.

## Arquivos afetados
- Migração Supabase (snapshot + FK).
- `src/pages/Estoque.tsx`
- `src/components/services/ServiceDialog.tsx`
- `src/components/services/ServiceViewDialog.tsx`
