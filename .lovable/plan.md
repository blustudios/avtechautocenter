

## Plano: Taxa Pix Máquina + Input Monetário + Custos Ocultos

### 4 melhorias combinadas

#### 1. Taxa "Pix Máquina" na maquininha
- **Migration**: `ALTER TABLE maquininhas ADD COLUMN taxa_pix_maquina numeric NOT NULL DEFAULT 0`
- **`Configuracoes.tsx`**: Campo "Taxa Pix Máquina (%)" no form, antes das bandeiras
- **`ServiceDialog.tsx`**: `getTaxRate` busca `taxa_pix_maquina` da maquininha para tipo "Pix Máquina"

#### 2. Parcelado: lista fixa 2x a 12x
- **`Configuracoes.tsx`**: Substituir ranges dinâmicos por 11 campos fixos (2x, 3x... 12x) com input de taxa %
- No save, gravar cada parcela com `parcelas_de = parcelas_ate = N`

#### 3. Input monetário (direita para esquerda)
- **Novo componente** `src/components/ui/currency-input.tsx`:
  - Valor armazenado em centavos, exibe `R$ X.XXX,XX`
  - Digitar "1" → `R$ 0,01`, "150" → `R$ 1,50`
  - `onChange` emite valor numérico como string
- **Aplicar em**: `ServiceDialog.tsx` (valor_total, valores pagamento, valores custo), `Estoque.tsx` (valor_medio_compra, valor_venda)

#### 4. Custos ocultos por padrão
- **`ServiceDialog.tsx`**: Iniciar `custos` como array vazio `[]` (não com 1 item)
- Seção de custos mostra apenas botão "+ Adicionar Custo" quando array vazio
- Ao clicar, adiciona primeiro item ao array e revela os campos
- Na edição, se já existem custos salvos, carregar normalmente (array preenchido)

### Arquivos modificados
- **Nova migration**: coluna `taxa_pix_maquina` em `maquininhas`
- **Novo**: `src/components/ui/currency-input.tsx`
- `src/pages/Configuracoes.tsx` — campo Pix Máquina, lista fixa 2x-12x
- `src/components/services/ServiceDialog.tsx` — CurrencyInput, getTaxRate para Pix, custos ocultos
- `src/pages/Estoque.tsx` — CurrencyInput nos campos de valor

