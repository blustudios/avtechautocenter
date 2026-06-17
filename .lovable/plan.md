# Plano de Melhorias

## 1) Seleção de Cliente pesquisável (ServiceDialog)

**Problema:** hoje o campo Cliente é um `<Select>` shadcn padrão, que não filtra ao digitar — com muitos clientes fica lento de achar.

**Solução proposta:** trocar o `Select` por um **Combobox** (padrão shadcn) usando `Popover` + `Command` (cmdk), que já existem no projeto (`src/components/ui/command.tsx`, `popover.tsx`). É a abordagem oficial do shadcn para "autocomplete de seleção", suporta teclado (↑/↓/Enter/Esc), busca difusa e fica consistente com o resto do app.

### Comportamento

- Input digitável no trigger mostrando o cliente selecionado (`Nome · CPF`) ou placeholder "Buscar cliente...".
- Ao focar/clicar abre menu suspenso com `CommandInput` no topo e lista filtrada.
- Filtro **case-insensitive** por: nome (substring) **e** dígitos do CPF (ignora pontuação). Ex.: digitar "joa" ou "123" funciona.
- Mostra "Nenhum cliente encontrado" via `CommandEmpty`.
- Selecionar item → seta `cliente_cpf` e zera `carro_placa` (mesmo comportamento atual).
- Mantém a mesma largura do campo atual e respeita dark theme.
- O campo "Carro" continua como `Select` (lista curta por cliente).

### Arquivos afetados

- `src/components/services/ServiceDialog.tsx`: substituir o bloco do `<Select>` Cliente (linhas ~597-605) por um novo subcomponente local `ClientCombobox` (ou inline) usando `Popover` + `Command`. Reaproveitar o `clienteSearch` já existente (linha 522).

### Detalhes técnicos

- Usar `cmdk`'s `Command.Item` com `value={`${nome} ${cpf}`}` para que o filtro nativo do cmdk cubra ambos. Para garantir busca por dígitos puros do CPF, normalizar `value` removendo pontuação: `value={`${nome} ${cpf.replace(/\D/g,'')} ${cpf}`}`.
- Trigger: `<Button variant="outline" role="combobox" className="w-full justify-between bg-card border-border">` exibindo nome selecionado + ícone `ChevronsUpDown`.
- Largura do `PopoverContent`: `w-[--radix-popover-trigger-width]` e `p-0`.
- Sem nova dependência (cmdk e popover já estão no projeto).

---

## 2) Gráfico de área: Lucro Líquido Real ao longo do mês (TabResumo)

**Objetivo:** novo card em `TabResumo.tsx` com um gráfico de área mostrando o **lucro líquido real diário acumulado** (ou diário — ver decisão abaixo) ao longo dos dias do mês selecionado, com área verde acima de 0 e vermelha abaixo de 0.

### Definição da métrica (consistente com KPI já existente)

Hoje o card "Lucro Líquido Real" usa: `totalEntradas - (totalSaidas - totalRetiradas)`, somente sobre `valor_realizado`.

Por dia `d` do mês:

- `entradas_d` = soma de `valor_realizado` de lançamentos `tipo='entrada'` cuja data efetiva seja `d`.
- `saidas_op_d` = soma de `valor_realizado` de `tipo='saida'` **excluindo** categoria "Retiradas", cuja data efetiva seja `d`.
- `lucro_d = entradas_d - saidas_op_d`
- **Série exibida:** acumulado mês a dia → `acumulado_d = Σ lucro_i (i ≤ d)`. Isso casa visualmente com o KPI no fim do mês.

"Data efetiva" = mesma regra já aplicada no resumo: usar a `data` do lançamento (campo `data`). Para linhas automáticas (`auto.entrada`/`auto.saida`), elas têm uma `data` única (último dia do mês) — somar tudo nesse dia mantém consistência com os KPIs.

### UI/visual

- Card novo logo abaixo dos KPIs (acima de "Previsto vs Realizado por Categoria").
- Título: **"Lucro Líquido Real — evolução no mês"**.
- Recharts `AreaChart` com `ResponsiveContainer` (altura 280).
- Eixo X: dia (1..N do mês). Eixo Y: R$.
- **Duas áreas sobrepostas** para colorir + e − (técnica padrão do Recharts):
  - `dataKey="positivo"` (= `max(acumulado,0)`) → preenchimento verde `#22C55E` com `fillOpacity` 0.35, stroke `#22C55E`.
  - `dataKey="negativo"` (= `min(acumulado,0)`) → preenchimento vermelho `#EF4444` com `fillOpacity` 0.35, stroke `#EF4444`.
- Linha de referência `y=0` (`ReferenceLine`) cinza.
- Tooltip dark (mesmo estilo dos outros gráficos) formatando em `formatCurrency` e mostrando "Dia DD".
- Estado vazio: "Sem dados no mês".

### Arquivos afetados

- `src/components/financeiro/TabResumo.tsx`:
  - Importar `AreaChart, Area, ReferenceLine` de `recharts`.
  - Novo `useMemo` `serieDiaria` que monta `[{ dia: 1, acumulado, positivo, negativo }, ...]` para todos os dias do mês corrente (usar `month` + `date-fns` `endOfMonth`/`getDate`, já usados no projeto).
  - Render do card antes do bloco "Previsto vs Realizado por Categoria".

### Diagrama da série

```text
acumulado
  +R$ ┤      ╱╲___          ← área verde
   0  ┼─────────────────
  -R$ ┤            ╲__      ← área vermelha
       1  5  10  15  20  25  30
```

### Sem mudanças

- Sem migrações de banco, sem novas dependências, sem alterar hooks de dados.

---

## Confirmações antes de implementar

Posso seguir com:

- Combobox shadcn (Popover+Command) para o Cliente — busca por nome **e** CPF.
- Gráfico de área **acumulado** do Lucro Líquido Real (verde/vermelho) no topo da aba Resumo.

# IMPLEMENTAÇÃO EXTRA  
- Em Financeiro, na aba Lançamentos, adicione um filtro de "hoje" com os lançamentos do dia em questão a fim de facilitar a conferencia. Exiba um botão de texto "limpar filtros" quando algum filtro estiver ativo para resetar todos os filtros para o padrão.