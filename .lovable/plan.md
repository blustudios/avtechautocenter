

## Plano de Melhorias — AV Tech

### Resumo das 9 alterações

1. **Popup de Novo Cliente com área de carros inline**
2. **Botão "..." com dropdown (editar/excluir) na listagem de clientes**
3. **Campo cor do carro como dropdown com cores pré-definidas e círculo colorido**
4. **Campo "Itens Fornecidos" no cadastro de fornecedores**
5. **Melhor separação visual no popup de visualização de serviço + custos antes de pagamentos**
6. **Status de pagamento: "Aguardando Pagamento" e "Pago" apenas**
7. **Remover opção "Aguardando Peça" do status de serviço**
8. **Filtro por data na tela de Serviços (últimos 3 dias, 7 dias, período manual)**
9. **Exibir carros do cliente no card da listagem**

---

### Detalhes técnicos

#### 1. Novo Cliente com carros inline — `Clientes.tsx`
- No dialog de criação/edição, adicionar seção "Carros" abaixo dos campos do cliente
- Permitir adicionar múltiplos carros inline (array de car forms) com botão + e ×
- Na função `saveClient`, após salvar o cliente, fazer upsert dos carros
- Reutilizar o dropdown de cor (item 3)

#### 2. Menu dropdown "..." na listagem — `Clientes.tsx`
- Importar `DropdownMenu` do shadcn
- Em cada card, adicionar botão `MoreHorizontal` que abre dropdown com "Editar" e "Excluir"
- `e.stopPropagation()` para não abrir o view dialog
- Excluir: confirmar com `confirm()`, deletar de `carros` e `clientes`

#### 3. Dropdown de cor com círculos — `Clientes.tsx` + `ServiceDialog.tsx` (se usado)
- Criar constante `CAR_COLORS` com valor hex: `{Branco: '#FFFFFF', Cinza: '#9CA3AF', Preto: '#000000', Azul: '#3B82F6', Vermelho: '#EF4444', Amarelo: '#EAB308', Verde: '#22C55E'}`
- Usar `Select` com `SelectItem` contendo um `<span>` circular com `backgroundColor` ao lado do nome

#### 4. Campo "Itens Fornecidos" — `Fornecedores.tsx`
- Adicionar campo `itens_fornecidos` (texto) no form state e no dialog
- **Migration**: `ALTER TABLE fornecedores ADD COLUMN itens_fornecidos text;`

#### 5. Separação visual no popup de serviço — `ServiceViewDialog.tsx`
- Adicionar `<Separator />` entre cada seção macro (info básica, serviços, custos, pagamentos, totais, observações)
- Adicionar títulos de seção com ícones
- **Reordenar**: Custos vem ANTES de Pagamentos
- Carregar custos com dados do fornecedor para exibir

#### 6. Status pagamento: apenas "Aguardando Pagamento" e "Pago"
- Em `format.ts`: mudar `paymentStatusLabels` — `pendente → 'Aguardando Pagamento'`, remover `parcial`
- Em `ServiceDialog.tsx` e `Servicos.tsx`: atualizar opções do select e filtros
- `StatusBadge.tsx`: ajustar estilo para `pendente` como amarelo (manter), remover `parcial`

#### 7. Remover "Aguardando Peça"
- Em `format.ts`: remover `aguardando_peca` de `statusLabels`
- Em `ServiceDialog.tsx` e `Servicos.tsx`: remover do select e filtros
- Em `StatusBadge.tsx`: remover estilo

#### 8. Filtro por data na tela de Serviços — `Servicos.tsx`
- Adicionar botões de atalho: "Últimos 3 dias", "Últimos 7 dias", "Todos"
- Adicionar opção "Personalizado" que revela dois date pickers (início/fim) usando `Popover` + `Calendar`
- Filtrar `servicos` pelo `data_entrada` comparando com o range selecionado

#### 9. Carros no card do cliente — `Clientes.tsx`
- Na query, já faz `select('*, carros(placa, marca, modelo)')` — basta exibir
- Abaixo do nome/CPF, listar os carros com `marca modelo` em texto menor, separados por vírgula ou em tags/badges discretas
- Usar ícone `Car` ao lado

---

### Migration necessária

Uma única migration para adicionar o campo de fornecedores:
```sql
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS itens_fornecidos text;
```

### Arquivos modificados
- `src/pages/Clientes.tsx` — itens 1, 2, 3, 9
- `src/pages/Fornecedores.tsx` — item 4
- `src/pages/Servicos.tsx` — itens 6, 7, 8
- `src/components/services/ServiceDialog.tsx` — itens 3, 6, 7
- `src/components/services/ServiceViewDialog.tsx` — item 5
- `src/components/StatusBadge.tsx` — itens 6, 7
- `src/lib/format.ts` — itens 6, 7

