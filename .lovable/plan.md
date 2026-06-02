## Plano: Validação de pagamentos marcados como "Pago"

### Contexto

Em `ServiceDialog.tsx` (usado tanto para serviços rápidos quanto completos), o usuário pode marcar a checkbox "Pago" de um pagamento mesmo com campos vazios (tipo "A Definir", sem máquina/bandeira, sem data ou valor zero). Hoje só existem validações ao **finalizar** (`runFinalizationChecks`, linha 446) — não há checagem ao **salvar** nem validação da consistência interna de cada pagamento marcado como Pago.

### Regra de conferência proposta

Para cada pagamento com `pago = true`, validar:

1. **Tipo de pagamento** ≠ vazio e ≠ "A Definir"
2. **Valor** > 0
3. **Data de pagamento** preenchida
4. **Maquininha** preenchida — somente quando `needsMaquininha(tipo)` (ou seja, exceto Pix CNPJ, Dinheiro, A Definir)
5. **Bandeira** preenchida — somente quando `needsBandeira(tipo)` (exceto Pix CNPJ, Dinheiro, Pix Máquina, A Definir)
6. **Parcelas** ≥ 1 — somente quando tipo for "Crédito Parcelado"

### Implementação

**Arquivo:** `src/components/services/ServiceDialog.tsx`

1. **Criar função `validatePagamentosPagos()`** (próximo às outras validações, antes de `attemptFinalize`):
   - Itera sobre `pagamentos`, filtra `p.pago === true`.
   - Para cada um, monta lista de campos faltantes usando os helpers já existentes `needsMaquininha` / `needsBandeira`.
   - Retorna array de strings no formato `"Pagamento #1: faltam Tipo, Data, Valor maior que zero"`.

2. **Acionar a validação em dois pontos:**
   - **`handleSave`** (linha 234): logo após o check de sessão, antes de gerar o ID. Se houver erros, exibir popup e abortar (`setLoading(false); return;`).
   - **`runFinalizationChecks`** (linha 446): adicionar os erros retornados ao array `errors` existente, junto com o atual check de "marcar todos como Pago".

3. **Popup de erro:**
   - Reaproveitar o mesmo `AlertDialog` já usado para `showFinalizationError` (estado `showFinalizationError: string[] | null`). Renomear conceitualmente para suportar erros de salvamento também, ou criar um segundo estado `showPaymentErrors`. Recomendado: reutilizar `showFinalizationError` por simplicidade — o componente já lista erros com bullets e título "Não é possível concluir".
   - Para o caso `handleSave` (não finalização), usar um título adaptado tipo "Verifique os pagamentos antes de salvar". A forma mais limpa é introduzir um único estado `validationErrors: { title: string; errors: string[] } | null` que substitui `showFinalizationError`.

4. **Mensagem do popup (exemplo):**
   ```
   Não foi possível salvar. Os seguintes pagamentos marcados como
   "Pago" estão incompletos:
   • Pagamento #1: preencha Maquininha, Bandeira e Data
   • Pagamento #2: o valor deve ser maior que zero
   ```

### Resultado esperado

- Impossível salvar/finalizar com pagamento marcado como Pago e dados incompletos.
- Mensagem clara apontando qual pagamento e quais campos faltam.
- Mesma regra aplicada para serviços rápidos e completos (ambos passam pelo mesmo dialog).
- Pagamentos com `pago = false` continuam permitidos com campos vazios (não quebra o fluxo de "A Definir").