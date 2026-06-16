## Melhorias no Módulo Financeiro

### 1. Renomear "Descrição" para "Título" + campo "Observações"

**Migração SQL** (tabela `financeiro_lancamentos`):
- Adicionar coluna `observacoes TEXT NULL`.
- Manter coluna existente `descricao` como o "Título" (sem rename para evitar quebrar código auto-gerado).

**Diálogos** (`LancamentoEntradaDialog.tsx`, `LancamentoSaidaDialog.tsx`):
- Trocar label "Descrição" por **"Título"**.
- Substituir o `<Textarea rows={2}>` por um `<Input>` de linha única (espaço menor, ideal para o título exibido na lista).
- Adicionar abaixo um novo campo **"Observações"** (`<Textarea rows={3}>`), opcional.
- Persistir `observacoes` nos insert/update.

**Lista** (`TabLancamentos.tsx` → `renderLine`):
- Quando `l.observacoes` existir, exibir um ícone `StickyNote` (lucide-react) **em laranja** (`text-primary`) imediatamente antes (ou após) do título.
- Envolver em `<Tooltip>` com `TooltipContent` mostrando o texto completo das observações (alt text via hover).

---

### 2. Saída Parcelada

**Migração SQL** (tabela `financeiro_lancamentos`):
- Adicionar `parcela_atual INT NULL`, `parcela_total INT NULL`, `parcela_grupo_id UUID NULL` (agrupa todas as parcelas relacionadas).
- Índice em `parcela_grupo_id`.

**Diálogo de Saída** (`LancamentoSaidaDialog.tsx`):
- Adicionar checkbox **"Parcelado"** (mutuamente exclusivo com "Recorrência" — desabilita um quando o outro está ativo, para evitar conflito de geração em série).
- Quando ativo, mostrar dois campos numéricos lado a lado: **"Parcela Atual"** e **"Parcelas Totais"** (validar: 1 ≤ atual ≤ total, total ≥ 2).
- Ao salvar com "Parcelado" marcado, em vez de inserir 1 linha, abrir fluxo de 2 confirmações via `AlertDialog`:
  1. **"Deseja replicar essa saída nos meses seguintes até a última parcela?"** (Sim/Não).
     - Se Sim: gerar lançamentos para parcelas `atual+1 … total`, somando 1 mês na data a cada parcela, status `a_pagar`, valor_realizado = 0.
  2. **"Deseja adicionar as parcelas anteriores nos meses anteriores com status pago?"** (Sim/Não), exibida apenas se `atual > 1`.
     - Se Sim: gerar lançamentos para parcelas `1 … atual-1`, subtraindo 1 mês na data a cada parcela, status `pago`, `valor_realizado = valor_previsto`.
  3. Em ambos os casos, todas as linhas compartilham o mesmo `parcela_grupo_id` (UUID gerado no cliente) e recebem seu `parcela_atual` / `parcela_total` corretos.
- Após salvar, exibir toast com total de lançamentos criados.

**Lista** (`TabLancamentos.tsx`):
- Quando `parcela_total` existir, append `" (N de M)"` ao final do título exibido (mantido em `text-muted-foreground` para diferenciar visualmente).

**Exclusão de parcelado** (decisão técnica):
- Reusar o `DeleteRecurrenceDialog` ou criar variante: ao excluir um lançamento com `parcela_grupo_id`, perguntar "Excluir apenas esta parcela" ou "Excluir esta e as futuras". Mantém consistência com recorrências.

---

### Detalhes Técnicos

**Estado nos diálogos:**
```ts
const [observacoes, setObservacoes] = useState('');
const [parcelado, setParcelado] = useState(false);
const [parcelaAtual, setParcelaAtual] = useState(1);
const [parcelaTotal, setParcelaTotal] = useState(2);
const [confirmStep, setConfirmStep] = useState<'none'|'futuras'|'anteriores'>('none');
```

**Geração de datas das parcelas:** usar `addMonths(parseISO(data), offset)` do `date-fns`, recalcular `mes_referencia` para cada parcela.

**Validação:** se `parcelado && (!parcelaTotal || parcelaTotal < 2 || parcelaAtual > parcelaTotal)` → bloquear save.

**Edição:** ao editar uma parcela existente, manter `parcelaAtual`/`parcelaTotal` read-only (só ajustar via exclusão do grupo). Observações são editáveis normalmente.

---

### Arquivos afetados
- Nova migração SQL (3 colunas em `financeiro_lancamentos`).
- `src/components/financeiro/LancamentoEntradaDialog.tsx` — Título + Observações.
- `src/components/financeiro/LancamentoSaidaDialog.tsx` — Título + Observações + Parcelado + fluxo de confirmações.
- `src/components/financeiro/TabLancamentos.tsx` — ícone de observação + sufixo "N de M".
- (Opcional) `src/components/financeiro/DeleteRecurrenceDialog.tsx` — estender para parcelas, ou criar `DeleteParcelaDialog.tsx`.

Pergunta rápida antes de implementar:
- **Parcelado + Recorrência:** confirmo que devem ser mutuamente exclusivos (não faz sentido um parcelamento recorrente)?
- **Edição de parcela:** ao editar Valor Previsto de uma parcela, devo propagar para as demais do mesmo grupo, ou alterar somente aquela?
