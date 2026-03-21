

## Plano: Exibir marca/modelo no card quando sem placa

### Problema
Linha 212 de `Servicos.tsx` só mostra info do carro via `s.carro` (join com tabela `carros`). Quando não há placa, `s.carro` é null e exibe "—". Os campos `carro_marca`/`carro_modelo` do serviço não são usados.

### Correção em `src/pages/Servicos.tsx`

1. **Interface `Servico`**: Adicionar `carro_marca?: string` e `carro_modelo?: string`
2. **Query** (linha ~52): Adicionar `carro_marca, carro_modelo` ao select (já vem automaticamente com `*`, mas garantir que o tipo reflete)
3. **Linha 212**: Trocar a lógica de exibição:
   - Se `s.carro` existe: mostrar `marca modelo · placa` (como hoje)
   - Senão, se `s.carro_marca` ou `s.carro_modelo`: mostrar `marca modelo · Sem Placa`
   - Senão: mostrar "—"

### Arquivo modificado
- `src/pages/Servicos.tsx`

