

## Plano: Fix bandeira deletion + botão lixeira vermelho

### Bug
Na função `save` (linha 86), ao editar, o código tenta deletar as bandeiras antes de deletar as taxas vinculadas. Como `taxas.bandeira_id` referencia `bandeiras.id`, a deleção falha silenciosamente (FK constraint). As bandeiras antigas permanecem e novas são inseridas, duplicando.

### Correção
Em `save`, quando `editId`:
1. Buscar IDs das bandeiras existentes da maquininha
2. Deletar `taxas` WHERE `bandeira_id` IN (ids das bandeiras)
3. Deletar `bandeiras` WHERE `maquininha_id` = editId
4. Inserir as novas bandeiras e taxas (fluxo existente)

### UI — Botão lixeira vermelho
- Substituir o botão `X` (ghost) por um ícone `Trash2` vermelho (`text-red-500`)
- Remover a condição `bandeirasForm.length > 1` — permitir remover todas as bandeiras (maquininha pode ter 0 bandeiras)
- Importar `Trash2` do lucide-react

### Arquivo modificado
- `src/pages/Configuracoes.tsx`

