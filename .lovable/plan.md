
## Objetivo
Na aba **Financeiro → Caixa**, adicionar um ícone de calculadora ao lado dos campos **Dinheiro** e **Stone (Maquininha)**. Ao clicar, abre um mini módulo de calculadora em popover, e o resultado pode ser aplicado ao campo por um botão "Usar valor".

## Escopo (o que muda)
- Apenas UI da aba Caixa (`src/components/financeiro/TabCaixa.tsx`).
- Novo componente reutilizável: `src/components/financeiro/CalculatorPopover.tsx`.
- Sem mudanças em banco, hooks ou lógica de conciliação.

## Comportamento
- Ícone `Calculator` (lucide-react) em botão `variant="ghost" size="icon"` posicionado à direita do `CurrencyInput` (usando um wrapper `flex gap-2 items-center`).
- Ao clicar, abre `Popover` (Radix, já disponível) com:
  - **Display** do valor atual/expressão (read-only, alinhado à direita, fonte maior).
  - **Grid de botões** 4 colunas: `C`, `⌫`, `÷`, `×`, `7 8 9 −`, `4 5 6 +`, `1 2 3 =`, `0 . = `.
  - Suporte a entrada por teclado quando o popover está aberto (dígitos, `.`/`,`, operadores, `Enter`=`=`, `Backspace`, `Esc` fecha).
  - Botão primário laranja **"Usar valor"** que:
    - Se houver expressão pendente, avalia primeiro.
    - Chama `onApply(resultadoNumérico)` → o `TabCaixa` seta o `state` do campo correspondente com `.toFixed(2)` (mesmo formato usado hoje pelo `CurrencyInput`).
    - Fecha o popover.
  - Botão secundário **"Fechar"**.
- Estado interno independente por popover (não persiste ao fechar).

## Motor de cálculo
- Parser seguro próprio (evitar `eval`): tokenizador + shunting-yard para `+ − × ÷` com precedência, ou avaliação sequencial simples esquerda-direita respeitando precedência de `× ÷`. Trabalhar em número, arredondar para 2 casas ao aplicar.
- Aceitar vírgula como separador decimal na exibição (converter para ponto internamente).
- Tratar divisão por zero → mostrar "Erro" e desabilitar "Usar valor".

## Arquivos
- **Criar** `src/components/financeiro/CalculatorPopover.tsx`
  - Props: `{ value?: string; onApply: (n: number) => void; ariaLabel?: string }`.
  - Usa `Popover`, `PopoverTrigger`, `PopoverContent`, `Button`.
- **Editar** `src/components/financeiro/TabCaixa.tsx`
  - Envolver cada input (Dinheiro e Stone) num `flex` com `<CalculatorPopover onApply={(n)=>setDinheiro(n.toFixed(2))} />` e equivalente para Stone.
  - Não adicionar no campo PJ (não foi pedido).

## Justificativa
Solução leve, isolada e reutilizável, sem tocar em lógica financeira. Usa componentes já presentes (Popover, Button) e mantém o padrão visual/dark do app. Deixa o campo PJ intocado conforme requisito.
