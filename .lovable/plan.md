

## Plano: Checkbox "Sem Placa" no Serviço Rápido

### O que muda

**`src/components/services/ServiceDialog.tsx`**

1. **Novo estado**: `semPlaca: boolean` (default `false`)
2. **UI**: Adicionar `Checkbox` + label "Sem Placa" ao lado direito do campo Placa (mesma linha, usando `flex items-center gap-2`)
3. **Comportamento quando marcado**:
   - Campo Placa fica desabilitado e limpo (`quickCar.placa = ''`)
   - Marca e Modelo continuam editáveis
4. **No save**: Se `semPlaca` está ativo, não inserir/upsert na tabela `carros` (pois placa é PK), e salvar `carro_placa: null` no serviço. Marca e modelo ficam apenas registrados no contexto do serviço (sem persistir em `carros`).
5. **Na edição**: Se o serviço carregado não tem `carro_placa` mas tinha marca/modelo salvos de outra forma, manter o checkbox marcado.

### Arquivo modificado
- `src/components/services/ServiceDialog.tsx`

