

## Plano: "A Definir" como padrão + valor automático

### 1. `src/lib/format.ts`
- Adicionar `'A Definir'` ao array `tiposPagamento`

### 2. `src/components/services/ServiceDialog.tsx`

**Tipo "A Definir" como padrão:**
- Ao adicionar novo pagamento, o campo `tipo` inicia com `'A Definir'` (em vez de string vazia)
- Quando `tipo === 'A Definir'`, ocultar campos de Maquininha, Bandeira e Parcelas (mostrar apenas Valor, Data e Checkbox Pago)

**Valor automático ao adicionar pagamento:**
- Calcular valor em aberto: `valor_total - soma dos valores dos pagamentos existentes`
- Se for o primeiro pagamento, preencher com `form.valor_total`
- Preencher o campo `valor` do novo pagamento com esse valor (se positivo, senão `'0'`)

### Arquivos modificados
- `src/lib/format.ts`
- `src/components/services/ServiceDialog.tsx`

