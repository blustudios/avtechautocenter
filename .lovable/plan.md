## Melhorias: Pré-seleção de Maquininha + Aviso de Cadastro de Cliente

### 1. Pré-seleção automática quando há apenas uma maquininha ativa

**Arquivo:** `src/components/services/ServiceDialog.tsx`

- Criar um helper `getDefaultMaquininhaId()` que retorna o `id` da única maquininha ativa, caso `maquininhas.filter(m => m.ativo !== false).length === 1`. Caso contrário retorna `''`.
- Aplicar nos 3 pontos onde um pagamento ganha um `tipo` que requer maquininha (função `needsMaquininha`):
  - Ao mudar `tipo` no Select (linha ~729): se o novo tipo precisa de maquininha e há só uma ativa, já preenche `maquininha_id` (e a `bandeira_id` continua vazia, exigindo seleção).
  - Ao adicionar pagamento via "Adicionar pagamento" (linha ~779): se o tipo padrão "A Definir" já não precisa, mantém vazio. Mas se mudar depois, o ponto acima cobre.
  - Ao auto-criar primeiro pagamento (linha ~719): mesma lógica.
- Não tocar em pagamentos já existentes carregados do banco (preservam histórico).

### 2. Aviso "Serviço com valor alto" + Configurações Geral

#### 2a. Nova subcategoria "Geral" em Configurações
- Adicionar novo card "Geral" (ícone `Bell` ou `AlertTriangle`) em `src/pages/Configuracoes.tsx`, apontando para `/configuracoes/geral`.
- Criar `src/pages/configuracoes/Geral.tsx` com a seção **"Aviso de Cadastro de Cliente"**:
  - Switch ON/OFF para habilitar o aviso.
  - `CurrencyInput` para o valor mínimo que dispara o aviso (default R$ 500,00).
  - Botão "Salvar" persistindo no banco.
- Registrar rota `/configuracoes/geral` em `src/App.tsx`.

#### 2b. Persistência das configurações
- Nova tabela `configuracoes_app` (key/value) — uma única linha por chave:
  ```
  chave text primary key
  valor jsonb not null
  updated_at timestamptz
  ```
  Chaves usadas: `aviso_cadastro_cliente` → `{ habilitado: boolean, valor_minimo: number }`.
- GRANT para `authenticated` (read/write) e `service_role`. RLS habilitado, política permitindo qualquer `authenticated` ler e gravar (configuração compartilhada do tenant único).
- Seed da chave com `{ habilitado: true, valor_minimo: 500 }`.

#### 2c. Pop-up de aviso no ServiceDialog
- No `ServiceDialog`, carregar a config ao abrir (junto com as outras queries do `Promise.all` em `loadRefs`).
- Disparar `AlertDialog` (já importado) com:
  - Ícone `AlertTriangle` laranja grande (warning).
  - Título: "Atenção!"
  - Descrição: "Serviço com valor alto! Lembre-se de atribuir um Cliente com CPF e telefone."
  - Botão único "Entendi" para fechar.
- Condições para abrir o pop-up (a cada interação que abre o card):
  - `aviso_cadastro_cliente.habilitado === true`
  - `!form.cliente_cpf` (sem cliente atribuído)
  - `parseFloat(form.valor_total) > valor_minimo`
- Trigger: `useEffect` que observa `[open, form.valor_total, form.cliente_cpf, configCarregada]`. Para garantir "a cada interação com o card", o aviso reaparece sempre que o dialog abrir e as condições continuarem verdadeiras (estado `dismissedNoSession` resetado quando `open` vira `false`).

### Arquivos afetados

**Novos**
- `src/pages/configuracoes/Geral.tsx`
- Migração SQL para tabela `configuracoes_app` + seed.

**Modificados**
- `src/pages/Configuracoes.tsx` (novo card "Geral")
- `src/App.tsx` (rota)
- `src/components/services/ServiceDialog.tsx` (pré-seleção + AlertDialog de aviso + carregamento da config)

### Riscos / Edge cases
- Se a maquininha única ativa for desativada após pré-seleção, o pagamento já salvo continua válido (lógica atual já preserva inativas referenciadas).
- Se o usuário desabilitar a config "Aviso de Cadastro", nenhum pop-up dispara, independente do valor.
- Aviso não bloqueia nada — é apenas reminder; usuário pode salvar mesmo sem cliente (regras de finalização atuais permanecem).
