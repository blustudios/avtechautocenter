

## Plano: Manter janela de edição aberta após atribuir cliente

### Problema
No `ServiceDialog.tsx` linha 834, o `onAssigned` chama `onClose()` que fecha o dialog de edição inteiro.

### Correção em `src/components/services/ServiceDialog.tsx` — linha 832-835

Substituir o callback `onAssigned` para recarregar os dados do serviço em vez de fechar:

```tsx
onAssigned={async () => {
  setShowAssignClient(false);
  // Recarregar dados do serviço para refletir o cliente atribuído
  const { data } = await supabase.from('servicos').select('*').eq('id', form.id).single();
  if (data) {
    setForm(prev => ({
      ...prev,
      cliente_cpf: data.cliente_cpf,
      carro_placa: data.carro_placa,
      is_servico_rapido: data.is_servico_rapido,
      carro_marca_livre: data.carro_marca_livre,
      carro_modelo_livre: data.carro_modelo_livre,
      carro_placa_livre: data.carro_placa_livre,
    }));
  }
}}
```

Isso fecha apenas o `AssignClientDialog`, atualiza o form com os dados do cliente atribuído (fazendo os campos mudarem de livre para cliente/carro), e mantém o `ServiceDialog` aberto.

### Arquivo modificado
- `src/components/services/ServiceDialog.tsx` (callback do onAssigned)

