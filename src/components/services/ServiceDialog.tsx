import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, X, Trash2 } from 'lucide-react';
import { formatCurrency, tiposPagamento } from '@/lib/format';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  serviceId?: string;
  defaultClienteCpf?: string;
  onClose: () => void;
}

export function ServiceDialog({ open, serviceId, defaultClienteCpf, onClose }: Props) {
  const isEdit = !!serviceId;
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [carros, setCarros] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [maquininhas, setMaquininhas] = useState<any[]>([]);
  const [bandeiras, setBandeiras] = useState<any[]>([]);
  const [taxas, setTaxas] = useState<any[]>([]);

  const [form, setForm] = useState({
    id: '',
    cliente_cpf: '',
    carro_placa: '',
    data_entrada: new Date().toISOString().split('T')[0],
    data_encerramento: '',
    status: 'a_iniciar',
    status_pagamento: 'pendente',
    valor_total: '',
    observacoes: '',
  });

  const [itens, setItens] = useState<{ descricao: string }[]>([{ descricao: '' }]);
  const [pagamentos, setPagamentos] = useState<{
    tipo: string; maquininha_id: string; bandeira_id: string; parcelas: string; valor: string;
  }[]>([{ tipo: '', maquininha_id: '', bandeira_id: '', parcelas: '', valor: '' }]);
  const [custos, setCustos] = useState<{
    item: string; quantidade: string; fornecedor_id: string; valor: string;
  }[]>([{ item: '', quantidade: '1', fornecedor_id: '', valor: '' }]);

  useEffect(() => {
    const load = async () => {
      const [c, f, m, b, t] = await Promise.all([
        supabase.from('clientes').select('cpf, nome'),
        supabase.from('fornecedores').select('id, nome'),
        supabase.from('maquininhas').select('id, nome'),
        supabase.from('bandeiras').select('id, maquininha_id, nome'),
        supabase.from('taxas').select('*'),
      ]);
      setClientes(c.data || []);
      setFornecedores(f.data || []);
      setMaquininhas(m.data || []);
      setBandeiras(b.data || []);
      setTaxas(t.data || []);

      if (isEdit) {
        const { data: sv } = await supabase.from('servicos').select('*').eq('id', serviceId).single();
        if (sv) {
          setForm({
            id: sv.id,
            cliente_cpf: sv.cliente_cpf || '',
            carro_placa: sv.carro_placa || '',
            data_entrada: sv.data_entrada,
            data_encerramento: sv.data_encerramento || '',
            status: sv.status,
            status_pagamento: sv.status_pagamento,
            valor_total: String(sv.valor_total),
            observacoes: sv.observacoes || '',
          });
          if (sv.cliente_cpf) {
            const { data: carrosData } = await supabase.from('carros').select('*').eq('cliente_cpf', sv.cliente_cpf);
            setCarros(carrosData || []);
          }
          const { data: it } = await supabase.from('servicos_itens').select('*').eq('servico_id', serviceId).order('ordem');
          if (it?.length) setItens(it.map(i => ({ descricao: i.descricao })));
          const { data: pg } = await supabase.from('servicos_pagamentos').select('*').eq('servico_id', serviceId);
          if (pg?.length) setPagamentos(pg.map(p => ({
            tipo: p.tipo, maquininha_id: p.maquininha_id || '', bandeira_id: p.bandeira_id || '',
            parcelas: p.parcelas ? String(p.parcelas) : '', valor: String(p.valor),
          })));
          const { data: ct } = await supabase.from('servicos_custos').select('*').eq('servico_id', serviceId);
          if (ct?.length) setCustos(ct.map(c => ({
            item: c.item, quantidade: String(c.quantidade),
            fornecedor_id: c.fornecedor_id || '', valor: String(c.valor),
          })));
        }
      }
    };
    load();
  }, [serviceId]);

  // Pre-fill client when defaultClienteCpf is provided (new service only)
  useEffect(() => {
    if (defaultClienteCpf && !isEdit && clientes.length > 0) {
      setForm(f => ({ ...f, cliente_cpf: defaultClienteCpf, carro_placa: '' }));
    }
  }, [defaultClienteCpf, isEdit, clientes]);

  useEffect(() => {
    if (form.cliente_cpf) {
      supabase.from('carros').select('*').eq('cliente_cpf', form.cliente_cpf)
        .then(({ data }) => setCarros(data || []));
    } else {
      setCarros([]);
    }
  }, [form.cliente_cpf]);

  const needsMaquininha = (tipo: string) => !['Pix CNPJ', 'Dinheiro'].includes(tipo);

  const getTaxRate = (tipo: string, bandeira_id: string, parcelas: number) => {
    if (!needsMaquininha(tipo)) return 0;
    let tipoDb = '';
    if (tipo === 'Débito' || tipo === 'Pix Máquina') tipoDb = 'debito';
    else if (tipo === 'Crédito à vista') tipoDb = 'credito_avista';
    else if (tipo === 'Crédito Parcelado') tipoDb = 'credito_parcelado';

    if (tipoDb === 'credito_parcelado') {
      const t = taxas.find(t => t.bandeira_id === bandeira_id && t.tipo_pagamento === tipoDb &&
        parcelas >= (t.parcelas_de || 0) && parcelas <= (t.parcelas_ate || 999));
      return t ? Number(t.percentual) : 0;
    }
    const t = taxas.find(t => t.bandeira_id === bandeira_id && t.tipo_pagamento === tipoDb);
    return t ? Number(t.percentual) : 0;
  };

  const calcValorLiquido = () => {
    return pagamentos.reduce((sum, p) => {
      const val = parseFloat(p.valor) || 0;
      const rate = getTaxRate(p.tipo, p.bandeira_id, parseInt(p.parcelas) || 0);
      return sum + val * (1 - rate / 100);
    }, 0);
  };

  const calcCustoTotal = () => custos.reduce((sum, c) => sum + (parseFloat(c.valor) || 0) * (parseFloat(c.quantidade) || 1), 0);

  const valorLiquido = calcValorLiquido();
  const custoTotal = calcCustoTotal();
  const lucroLiquido = valorLiquido - custoTotal;

  const handleSave = async () => {
    setLoading(true);
    try {
      let id = form.id;
      if (!isEdit) {
        const { data } = await supabase.rpc('generate_service_id');
        id = data as string;
      }

      const dataEnc = form.status === 'entregue' && !form.data_encerramento
        ? new Date().toISOString().split('T')[0] : form.data_encerramento || null;

      const servicoData = {
        id,
        cliente_cpf: form.cliente_cpf || null,
        carro_placa: form.carro_placa || null,
        data_entrada: form.data_entrada,
        data_encerramento: dataEnc,
        status: form.status,
        status_pagamento: form.status_pagamento,
        valor_total: parseFloat(form.valor_total) || 0,
        valor_liquido: valorLiquido,
        custo_total: custoTotal,
        lucro_liquido: lucroLiquido,
        observacoes: form.observacoes || null,
      };

      if (isEdit) {
        await supabase.from('servicos').update(servicoData).eq('id', id);
        await supabase.from('servicos_itens').delete().eq('servico_id', id);
        await supabase.from('servicos_pagamentos').delete().eq('servico_id', id);
        await supabase.from('servicos_custos').delete().eq('servico_id', id);
      } else {
        await supabase.from('servicos').insert(servicoData);
      }

      const validItens = itens.filter(i => i.descricao.trim());
      if (validItens.length) {
        await supabase.from('servicos_itens').insert(
          validItens.map((i, idx) => ({ servico_id: id, descricao: i.descricao, ordem: idx }))
        );
      }

      const validPag = pagamentos.filter(p => p.tipo && parseFloat(p.valor));
      if (validPag.length) {
        await supabase.from('servicos_pagamentos').insert(
          validPag.map(p => ({
            servico_id: id,
            tipo: p.tipo,
            maquininha_id: p.maquininha_id || null,
            bandeira_id: p.bandeira_id || null,
            parcelas: p.parcelas ? parseInt(p.parcelas) : null,
            valor: parseFloat(p.valor) || 0,
            taxa_aplicada: getTaxRate(p.tipo, p.bandeira_id, parseInt(p.parcelas) || 0),
          }))
        );
      }

      const validCustos = custos.filter(c => c.item.trim());
      if (validCustos.length) {
        await supabase.from('servicos_custos').insert(
          validCustos.map(c => ({
            servico_id: id,
            item: c.item,
            quantidade: parseFloat(c.quantidade) || 1,
            fornecedor_id: c.fornecedor_id || null,
            valor: parseFloat(c.valor) || 0,
          }))
        );
      }

      toast.success(isEdit ? 'Serviço atualizado!' : 'Serviço criado!');
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar serviço');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isEdit && (
              <div>
                <Label>ID do Serviço</Label>
                <Input value={form.id} readOnly className="bg-card border-border" />
              </div>
            )}
            <div>
              <Label>Cliente</Label>
              <Select value={form.cliente_cpf} onValueChange={v => setForm({ ...form, cliente_cpf: v, carro_placa: '' })}>
                <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.cpf} value={c.cpf}>{c.nome} · {c.cpf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Carro</Label>
              <Select value={form.carro_placa} onValueChange={v => setForm({ ...form, carro_placa: v })}>
                <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {carros.map(c => (
                    <SelectItem key={c.placa} value={c.placa}>{c.marca} {c.modelo} · {c.placa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de Entrada</Label>
              <Input type="date" value={form.data_entrada} onChange={e => setForm({ ...form, data_entrada: e.target.value })} className="bg-card border-border" />
            </div>
            <div>
              <Label>Data de Encerramento</Label>
              <Input type="date" value={form.data_encerramento} onChange={e => setForm({ ...form, data_encerramento: e.target.value })} className="bg-card border-border" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_iniciar">À Iniciar</SelectItem>
                  <SelectItem value="em_progresso">Em Progresso</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Service items */}
          <div>
            <Label className="mb-2 block">Descrição dos Serviços</Label>
            {itens.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input
                  value={item.descricao}
                  onChange={e => { const n = [...itens]; n[i].descricao = e.target.value; setItens(n); }}
                  placeholder="Ex: Troca de pneus 205/55R16"
                  className="bg-card border-border flex-1"
                />
                {itens.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setItens(itens.filter((_, j) => j !== i))}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setItens([...itens, { descricao: '' }])}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Valor Total do Serviço (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_total} onChange={e => setForm({ ...form, valor_total: e.target.value })} className="bg-card border-border" />
            </div>
            <div>
              <Label>Valor Líquido</Label>
              <Input value={formatCurrency(valorLiquido)} readOnly className="bg-card border-border" />
            </div>
          </div>

          {/* Costs - moved before payments */}
          <div>
            <Label className="mb-2 block">Custos</Label>
            {custos.map((c, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-3 mb-2 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input value={c.item} onChange={e => { const n = [...custos]; n[i].item = e.target.value; setCustos(n); }}
                    placeholder="Item" className="bg-background border-border" />
                  <Select value={c.fornecedor_id} onValueChange={v => { const n = [...custos]; n[i].fornecedor_id = v; setCustos(n); }}>
                    <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
                    <SelectContent>
                      {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" value={c.quantidade} onChange={e => { const n = [...custos]; n[i].quantidade = e.target.value; setCustos(n); }}
                    placeholder="Qtd" className="bg-background border-border" />
                  <Input type="number" step="0.01" value={c.valor} onChange={e => { const n = [...custos]; n[i].valor = e.target.value; setCustos(n); }}
                    placeholder="Valor (R$)" className="bg-background border-border" />
                </div>
                {custos.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setCustos(custos.filter((_, j) => j !== i))}>
                    <X className="w-4 h-4 mr-1" /> Remover
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setCustos([...custos, { item: '', quantidade: '1', fornecedor_id: '', valor: '' }])}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar Custo
            </Button>
            <p className="text-sm text-muted-foreground mt-1">Total de Custos: {formatCurrency(custoTotal)}</p>
          </div>

          {/* Payments */}
          <div>
            <Label className="mb-2 block">Formas de Pagamento</Label>
            {pagamentos.map((p, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-3 mb-2 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <Select value={p.tipo} onValueChange={v => {
                    const n = [...pagamentos]; n[i].tipo = v; n[i].maquininha_id = ''; n[i].bandeira_id = ''; setPagamentos(n);
                  }}>
                    <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      {tiposPagamento.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {needsMaquininha(p.tipo) && (
                    <Select value={p.maquininha_id} onValueChange={v => {
                      const n = [...pagamentos]; n[i].maquininha_id = v; n[i].bandeira_id = ''; setPagamentos(n);
                    }}>
                      <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Maquininha" /></SelectTrigger>
                      <SelectContent>
                        {maquininhas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}

                  {needsMaquininha(p.tipo) && p.maquininha_id && (
                    <Select value={p.bandeira_id} onValueChange={v => {
                      const n = [...pagamentos]; n[i].bandeira_id = v; setPagamentos(n);
                    }}>
                      <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Bandeira" /></SelectTrigger>
                      <SelectContent>
                        {bandeiras.filter(b => b.maquininha_id === p.maquininha_id).map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {p.tipo === 'Crédito Parcelado' && (
                    <Input
                      type="number" placeholder="Parcelas" value={p.parcelas}
                      onChange={e => { const n = [...pagamentos]; n[i].parcelas = e.target.value; setPagamentos(n); }}
                      className="bg-background border-border"
                    />
                  )}

                  <Input
                    type="number" step="0.01" placeholder="Valor (R$)" value={p.valor}
                    onChange={e => { const n = [...pagamentos]; n[i].valor = e.target.value; setPagamentos(n); }}
                    className="bg-background border-border"
                  />
                </div>
                {pagamentos.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setPagamentos(pagamentos.filter((_, j) => j !== i))}>
                    <X className="w-4 h-4 mr-1" /> Remover
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setPagamentos([...pagamentos, { tipo: '', maquininha_id: '', bandeira_id: '', parcelas: '', valor: '' }])}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar Pagamento
            </Button>
          </div>

          {/* Payment status & profit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Status do Pagamento</Label>
              <Select value={form.status_pagamento} onValueChange={v => setForm({ ...form, status_pagamento: v })}>
                <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Aguardando Pagamento</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lucro Líquido</Label>
              <div className={`p-2 rounded border border-border text-lg font-semibold ${lucroLiquido >= 0 ? 'text-status-entregue' : 'text-destructive'}`}>
                {formatCurrency(lucroLiquido)}
              </div>
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="bg-card border-border" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Serviço'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
