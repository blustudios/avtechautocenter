# Plano: Subcategorias em Configurações + Switch Ativo/Inativo nas Maquininhas

## 1) Reorganização da página de Configurações

### Estrutura nova
- `/configuracoes` → **hub** com dois cards de subcategoria (Maquininhas, Marcas e Modelos). Visual: cards grandes com ícone, título e descrição curta.
- `/configuracoes/maquininhas` → conteúdo atual da seção Maquininhas (lista, formulário, bandeiras, taxas).
- `/configuracoes/marcas-modelos` → conteúdo atual da seção Marcas e Modelos (lista, importação XML).

### Implementação
- Quebrar `src/pages/Configuracoes.tsx` em 3 arquivos:
  - `src/pages/Configuracoes.tsx` — hub com cards (novo conteúdo enxuto)
  - `src/pages/configuracoes/Maquininhas.tsx` — toda a lógica de maquininhas/bandeiras/taxas (migrar do arquivo atual)
  - `src/pages/configuracoes/MarcasModelos.tsx` — toda a lógica de marcas/modelos + import XML
- Cada subpágina exibe um botão "Voltar" para `/configuracoes`.
- Registrar as rotas em `src/App.tsx`.
- O item "Configurações" no `AppSidebar` continua apontando para `/configuracoes` (hub).

## 2) Switch Ativo/Inativo nas Maquininhas

### Banco
Migration:
```sql
ALTER TABLE public.maquininhas
  ADD COLUMN ativo boolean NOT NULL DEFAULT true;
```
(Maquininhas existentes ficam todas ativas.)

### UI — página Maquininhas
- Em cada card da lista, no canto direito, um `Switch` (shadcn) com label "Ativa".
- Click no switch **não** abre o formulário de edição (`stopPropagation` no wrapper).
- Toggle chama `supabase.from('maquininhas').update({ ativo: !cur }).eq('id', m.id)`, atualiza estado local, e mostra `toast`.
- Card inativo: aplicar `opacity-60` e badge "Inativa" sutil.

### Filtragem no formulário de pagamento (`ServiceDialog`)
- Linha 89: alterar `select('id, nome, taxa_pix_maquina')` para `.eq('ativo', true)`.
- **Caso de borda:** ao editar um pagamento antigo cuja maquininha foi desativada após o registro, ela não apareceria no select, "perdendo" a referência visual.
  - Solução: além das ativas, incluir explicitamente os IDs já referenciados em `pagamentosForm`. Ao montar a lista do `Select`, fazer um `union` entre `maquininhas` (ativas) e maquininhas presentes em pagamentos atuais (carregadas separadamente, marcadas como "Inativa" no item).
  - Isso preserva consistência sem quebrar serviços históricos.

## 3) Arquivos afetados
- **Novos:** `src/pages/configuracoes/Maquininhas.tsx`, `src/pages/configuracoes/MarcasModelos.tsx`
- **Editados:** `src/pages/Configuracoes.tsx` (vira hub), `src/App.tsx` (rotas), `src/components/services/ServiceDialog.tsx` (filtro `ativo` + preservação de inativa em edição), tipo Supabase regenerado pela migration.

## 4) Riscos
- Nenhum impacto em dados existentes (default `true`).
- Quebra do arquivo grande pode introduzir bugs de import — mitigado movendo blocos inteiros sem refatorar lógica.
