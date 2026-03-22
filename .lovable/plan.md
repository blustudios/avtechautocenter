

## Plano: KPIs "Lucro Líquido" e "Custos dos Serviços" no Dashboard

### Alterações em `src/pages/Dashboard.tsx`

1. **Interface `Servico`**: adicionar `custo_total: number`
2. **Query de serviços**: adicionar `custo_total` ao select
3. **Novos cálculos**:
   - `custoTotal = servicos.reduce((s, v) => s + Number(v.custo_total), 0)`
   - `lucroLiquidoReal = lucroLiquido - custoTotal`
4. **Dois novos cards no array `metrics`**:
   - `{ label: 'Lucro Líquido', value: formatCurrency(lucroLiquidoReal), icon: TrendingUp }` — após "(Faturamento) - (% Taxas)"
   - `{ label: 'Custos dos Serviços', value: formatCurrency(custoTotal), icon: TrendingDown }` — após "Lucro Líquido"

### Arquivo modificado
- `src/pages/Dashboard.tsx`

