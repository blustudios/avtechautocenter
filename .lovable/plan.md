## Implementação Concluída: Overhaul completo do fluxo de Entrada de Serviço

### O que foi feito

1. **Migration**: Novos campos (`data_orcamento`, `is_servico_rapido`, `carro_marca_livre`, `carro_modelo_livre`, `carro_placa_livre`), tabela `servicos_historico`, migração de status (`a_iniciar` → `em_progresso`, `entregue` → `finalizado`)

2. **Novo fluxo de entrada**: Popup "Selecione o tipo de Entrada" com 3 opções (Orçamento, Serviço Rápido, Serviço Completo). Botão "Rápido" removido.

3. **Novos status**: `orcamento`, `em_progresso`, `finalizado`, `cancelado` com badges e cores distintas.

4. **Cards com bordas coloridas**: Azul (orçamento), verde (finalizado), vermelho (cancelado). Apenas `em_progresso` mostra tag de pagamento.

5. **Summary popup read-only** com botões de ação por status (Executar Serviço, Cancelar Orçamento, Reabrir, Finalizar, Excluir, etc.)

6. **Formulário adaptativo**: Seções condicionais por status (Pagamentos hidden em orçamento, data_compra hidden em orçamento, Estimativa de Lucro vs Lucro Líquido)

7. **Checklist de finalização**: Verifica lucro negativo, data_entrada, itens, custos sem data, pagamentos não pagos.

8. **Atribuir Cliente**: Modal de busca e atribuição para serviços rápidos.

9. **Histórico de alterações**: Tabela + modal de visualização.

10. **Dashboard**: KPIs excluem `orcamento` e `cancelado`.

### Arquivos criados
- `src/components/services/EntryTypeDialog.tsx`
- `src/components/services/AssignClientDialog.tsx`
- `src/components/services/HistoryDialog.tsx`

### Arquivos modificados
- `src/lib/format.ts`
- `src/components/StatusBadge.tsx`
- `src/components/services/ServiceViewDialog.tsx`
- `src/components/services/ServiceDialog.tsx`
- `src/pages/Servicos.tsx`
- `src/pages/Dashboard.tsx`
