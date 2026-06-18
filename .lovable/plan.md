## Melhorias na aba Lançamentos (Financeiro)

### 1. Substituir filtro "Hoje" por filtro de período (data inicial / data final)

**Remoção:**
- Remover botão "Hoje" e estado `filtroHoje`.

**Adição:**
- Dois campos de data ("De" e "Até") usando o Shadcn DatePicker (Popover + Calendar com `pointer-events-auto`), seguindo o padrão dark-mode do projeto.
- Estados: `dataIni: Date | undefined`, `dataFim: Date | undefined`.
- Lógica de filtro aplicada sobre `l.data` (a data cadastrada da entrada/saída):
  - Se `dataIni` e `dataFim` preenchidos → intervalo fechado `[dataIni, dataFim]`.
  - Se só `dataIni` → mostra apenas lançamentos com `l.data === dataIni`.
  - Se só `dataFim` → mostra apenas lançamentos com `l.data === dataFim` (simétrico, comportamento intuitivo).
  - Nenhum preenchido → sem filtro de data.
- Botões "x" pequenos em cada campo para limpar individualmente.
- `hasFilters` e `limparFiltros` atualizados para considerar `dataIni`/`dataFim`.
- Os datepickers só permitem selecionar datas dentro do mês ativo (`MonthContext`) — já que `manuais`/`auto` são carregados por mês —, evitando confusão de resultado vazio.

**Layout:** Os dois campos ficam na mesma linha de filtros, lado a lado, posição onde estava o botão "Hoje". Em mobile, quebram para a próxima linha (`flex-wrap` já existente).

### 2. Categorias de SAÍDAS colapsadas por padrão + atalho "Recolher tudo"

**Padrão colapsado:**
- Mudar default de `openCats[key] ?? true` para `openCats[key] ?? false`. Assim, ao abrir a aba, todas as categorias começam fechadas.
- A seção mestre "SAÍDAS" (`openSaidas`) continua expandida por padrão (mostra a lista de categorias colapsadas).

**Atalho "Recolher tudo":**
- Adicionar pequeno botão/link `Recolher tudo` ao lado do título "SAÍDAS" no header mestre.
- Visível apenas quando `openSaidas === true` e houver ao menos uma categoria expandida (`Object.values(openCats).some(v => v === true)`).
- Ao clicar: `setOpenCats({})` — reseta para todas colapsadas. `stopPropagation` no clique para não colapsar a seção mestre.
- Estilo: `text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline`, com pequeno ícone `ChevronsUpDown` (opcional).

### Arquivo a editar
- `src/components/financeiro/TabLancamentos.tsx` (único arquivo afetado).

### Detalhes técnicos
- Comparação de datas: `l.data` é string ISO `YYYY-MM-DD`. Converter `dataIni`/`dataFim` para o mesmo formato com helper local (sem timezone shift) — usar `format(date, 'yyyy-MM-DD')` do `date-fns` para evitar problemas de fuso.
- Não há mudança em hooks/queries — somente filtragem client-side já existente em `filtered`.
