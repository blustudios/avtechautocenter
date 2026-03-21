
Plano revisado — correção definitiva do bug + regras de bandeiras em uso

1) Corrigir o bug de duplicação (src/pages/Configuracoes.tsx)
- Refatorar o `save` para **sincronização incremental** (não apagar tudo e recriar).
- Fluxo no editar:
  - Atualiza `maquininhas` (nome/taxa pix).
  - Compara bandeiras atuais do banco vs `bandeirasForm`.
  - **Mantidas**: atualiza nome e mantém id.
  - **Novas**: insere.
  - **Removidas**: tenta excluir apenas as removidas (primeiro `taxas`, depois `bandeiras`) se não estiverem em uso.
- Com isso, para de ocorrer FK error em lote + inserção duplicada.

2) Regra “Em uso” + bloqueio de exclusão
- Ao carregar maquininha, buscar contagem de uso em `servicos_pagamentos` por `bandeira_id`.
- Exibir badge visível **“Em uso”** em cada bandeira usada.
- Desabilitar botão de lixeira dessas bandeiras (UI + bloqueio lógico no save).
- Mensagem de feedback: “Não é possível remover bandeira usada em serviços já salvos.”

3) Botão “Atualizar” por bandeira (com confirmação)
- Adicionar botão **Atualizar** em cada card de bandeira.
- Botão habilita somente quando algum percentual mudar (débito, crédito à vista, 2x..12x), comparando com snapshot original da bandeira.
- Ao clicar, abrir `AlertDialog` com texto:
  - “Estas mudanças irão modificar os valores de serviços que já utilizem essa bandeira. Deseja continuar?”
- Confirmando:
  - Atualiza taxas da bandeira.
  - Recalcula `taxa_aplicada` de todos `servicos_pagamentos` que usam essa bandeira.
  - Recalcula `valor_liquido` e `lucro_liquido` dos `servicos` afetados.
  - Atualiza snapshot e mostra toast de sucesso.

4) Não permitir nomes duplicados de bandeira na mesma maquininha
- Validação em tempo real no formulário (case-insensitive + trim).
- Se duplicado, mostrar abaixo do campo:
  - `* Este nome já está em uso nesta maquiniha. Utilize um nome diferente.`
- Bloquear salvar enquanto houver duplicidade.
- Bloquear também “Atualizar” da bandeira com nome duplicado para evitar inconsistência.

5) UX/Responsividade (mobile/tablet/desktop)
- Linha de ações da bandeira adaptável (`flex-col sm:flex-row`) para manter lixeira, badge e botão Atualizar sem quebrar layout.
- Inputs e mensagens de erro com espaçamento consistente para toque em mobile.
- Estados visuais claros:
  - lixeira desabilitada quando “Em uso”,
  - botão Atualizar desabilitado quando sem mudanças.

Detalhes técnicos (implementação)
- Arquivo principal: `src/pages/Configuracoes.tsx`.
- Novos estados:
  - `bandeirasEmUso` (Set de ids),
  - `originalTaxasByBandeiraId`,
  - controle de confirmação do “Atualizar”.
- Funções auxiliares:
  - normalização de nome (`trim().toLowerCase()`),
  - detecção de duplicados por índice,
  - diff de taxas por bandeira,
  - recálculo de pagamento/serviço após atualização.
- Sem migration obrigatória para esta entrega (regra de duplicidade aplicada no fluxo da tela).
