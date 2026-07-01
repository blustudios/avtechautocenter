# Plano — Reestruturação do Estoque de Pneus

## 1. Banco de dados (migração)

### 1.1 Nova tabela `marcas_pneus`

- Campos: `nome` (único, case-insensitive).
- RLS igual às demais tabelas de catálogo.
- Adicionar em `estoque_pneus` a coluna `marca_id uuid` referenciando `marcas_pneus(id)`.

### 1.2 Nova tabela `estoque_pneus_compras` (histórico de inputs)

- Campos: `pneu_id` (FK → estoque_pneus, ON DELETE CASCADE), `data_compra date`, `quantidade int`, `valor_unitario numeric`, `fornecedor_id uuid` (FK → fornecedores, nullable).
- Índice por `pneu_id, data_compra desc`.
- Grants + RLS padrão do projeto.

### 1.3 Ajustes em `estoque_pneus`

- Remover uso de `valor_venda` da UI (a coluna pode permanecer no banco por compatibilidade, mas deixa de ser exibida/editada).
- `valor_medio_compra` passa a ser calculado (média dos últimos 5 registros de compra). Manter a coluna como cache, atualizada por trigger a cada inserção em `estoque_pneus_compras`.
- `quantidade` continua sendo o total atual, alterado por: cadastro inicial, "Adicionar estoque", edição manual e baixa por serviço.

### 1.4 Migração de dados existentes

- Criar registros em `marcas_pneus` deduplicando as marcas atuais por `UPPER(TRIM(nome))`. As duplicidades identificadas (ex.: `SUNNI`/`SUNNY`, `gallant`/`galant`, `comforser`/`conforser`, `vulk line`/`VULK LINE`/`Vulk line` ) serão consolidadas em uma única marca com nome normalizado em Title Case.
- Popular `estoque_pneus.marca_id` a partir do texto atual.
- Criar 1 registro em `estoque_pneus_compras` por pneu existente usando `created_at` como `data_compra`, `quantidade` atual e `valor_medio_compra` como `valor_unitario` (fornecedor nulo), para não perder histórico.

## 2. Página `/estoque` — nova UI

### 2.1 Layout

- Ordenação fixa por `quantidade` desc.
- Paginação 30/página no mesmo padrão das demais páginas.
- **Filtros** (2 linhas):
  - Linha 1: busca textual (marca ou medida).
  - Linha 2: dropdown Aro | dropdown Tipo | dropdown Marca.
- Botão principal passa a se chamar **"+ Cadastrar Pneu"**.

### 2.2 Card do pneu (alinhamento à esquerda)

- `MEDIDA_01/MEDIDA_02 ARO` (destaque).
- Marca.
- Quantidade destacada com indicador de cor: verde ≥ 4, laranja 1–3, cinza 0.
- Tipo.

### 2.3 Ações à direita

- Ícone **Histórico** (abre janela de histórico).
- Ícone **Editar** (marca, medidas, tipo e estoque atual — sem valor).
- Botão verde **"+ Adicionar"** (abre janela de adicionar estoque).

### 2.4 Janela "+ Adicionar" (novo input de compra)

Campos: Data (hoje), Quantidade (default 1, stepper ±1), Valor Unitário (R$), Fornecedor (autocomplete sobre `fornecedores`). Ações: Cancelar / Adicionar. Ao confirmar: insere em `estoque_pneus_compras` e soma na `quantidade` do pneu.

### 2.5 Janela "+ Cadastrar Pneu"

Campos na ordem: Data compra (hoje), Marca (dropdown com filtro + "Cadastrar nova marca"), Tipo, Medida 01 (numérico), Medida 02 (numérico), Aro (dropdown R13–R24), Quantidade (stepper, default 1), Valor Unitário de Compra (R$), Fornecedor (autocomplete). Sem campo valor de venda.

- Ao salvar: cria pneu + primeiro registro em `estoque_pneus_compras`.
- **Duplicidade**: se já existir combinação `marca_id + medida_01 + medida_02 + aro`, popup avisa "Pneu já cadastrado. Deseja adicionar um novo registro de compra?" → Sim registra a compra e soma à quantidade; Não cancela.

### 2.6 Janela de Histórico de Compra

- Lista os últimos 5 inputs: data, valor unitário, fornecedor.
- Cards de resumo: **Média de preço**, **Maior preço pago**, **Menor preço pago** (calculados sobre os mesmos 5 registros).

## 3. Gestão de Marcas de Pneus

### 3.1 Novo submenu em Configurações → **"Marcas de Pneus"**

- Lista de marcas com editar/excluir e campo para cadastrar nova.
- Ao excluir uma marca **em uso** por algum pneu no estoque: popup obrigatório com dropdown "Substituir por" (marcas restantes). Só permite excluir após substituir; reatribui `marca_id` de todos os pneus antes do delete.

### 3.2 Dropdown de marca (usado no cadastro de pneu)

- Autocomplete sobre `marcas_pneus`.
- Se o texto digitado não corresponde a nenhuma, exibe opção **"Cadastrar nova marca"** que abre popup com campo texto + Cancelar/Salvar. Ao salvar, adiciona à `marcas_pneus` e seleciona automaticamente.

## 4. `PneuSelectorDialog` (janela "Adicionar Pneu" em Serviços)

- Adaptar o layout ao novo padrão visual (mesmos filtros e busca no topo).
- Listar apenas pneus com `quantidade > 0`.
- Remover o formulário inline de "Cadastrar Novo Pneu" (cadastro passa a ser apenas na página Estoque para manter fluxo consistente com o novo processo com histórico de compra).
- Ao confirmar seleção: abater estoque conforme a lógica atual.
- Se o usuário tentar inserir quantidade > estoque disponível, exibir popup de aviso (não apenas toast).

## 5. Detalhes técnicos

- **Arquivos criados**:
  - `src/pages/configuracoes/MarcasPneus.tsx`
  - `src/components/estoque/PneuCard.tsx`
  - `src/components/estoque/CadastrarPneuDialog.tsx`
  - `src/components/estoque/AdicionarEstoqueDialog.tsx`
  - `src/components/estoque/HistoricoCompraDialog.tsx`
  - `src/components/estoque/EditarPneuDialog.tsx`
  - `src/components/estoque/MarcaAutocomplete.tsx`
  - `src/components/estoque/FornecedorAutocomplete.tsx`
- **Arquivos alterados**: `src/pages/Estoque.tsx` (reescrita), `src/pages/Configuracoes.tsx` (novo item de menu + rota), `src/App.tsx` (rota), `src/components/services/PneuSelectorDialog.tsx` (adaptação).
- **Trigger SQL**: `after insert on estoque_pneus_compras` → recalcula `valor_medio_compra` (média dos últimos 5) do pneu.
- **Autocomplete de Fornecedor**: reutiliza `autocomplete-input` já existente.
- Paginação segue o padrão de `Servicos.tsx`.

## 6. Ordem de execução

1. Migração (tabelas + grants + RLS + trigger + backfill de marcas e histórico).
2. Submenu de Marcas de Pneus em Configurações.
3. Componentes reutilizáveis (autocompletes, dialogs).
4. Reescrita da página `/estoque`.
5. Adaptação do `PneuSelectorDialog`.
6. Validação end-to-end (cadastro, duplicidade, adicionar estoque, histórico, exclusão de marca em uso, baixa em serviço).

## 7. Pontos de confirmação

- Consolidação das marcas duplicadas: `SUNNI`+`SUNNY` → **Sunny**; `gallant`+`galant` → **Gallant**; `comforser`+`conforser` → **Comforser**; `vulk line`+`VULK LINE`+`Vulk line`  → **Vulk Line**; `mazzini`+`mazzini falconer` → **Mazzini.**
- O campo `valor_venda` deixa de aparecer em qualquer tela — removê-lo também do banco.