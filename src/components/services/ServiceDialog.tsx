import { useState, useEffect } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Plus, X, Trash2, UserPlus, Car } from 'lucide-react';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { formatCurrency, formatPlaca, tiposPagamento } from '@/lib/format';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  serviceId?: string;
  defaultClienteCpf?: string;
  quickMode?: boolean;
  onClose: () => void;
}

export function ServiceDialog({ open, serviceId, defaultClienteCpf, quickMode, onClose }: Props) {
  const isEdit = !!serviceId;
  const [showClientFields, setShowClientFields] = useState(false);
  const [quickCar, setQuickCar] = useState({ marca: '', modelo: '', placa: '' });
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [carros, setCarros] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [maquininhas, setMaquininhas] = useState<any[]>([]);
  const [bandeiras, setBandeiras] = useState<any[]>([]);
  const [taxas, setTaxas] = useState<any[]>([]);
  const [marcasList, setMarcasList] = useState<{ id: string; nome: string }[]>([]);
  const [modelosList, setModelosList] = useState<{ id: string; marca_id: string; nome: string }[]>([]);

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
  }[]>([]);

  useEffect(() => {
    const load = async () => {
      const [c, f, m, b, t, mc, md] = await Promise.all([
        supabase.from('clientes').select('cpf, nome'),
        supabase.from('fornecedores').select('id, nome'),
        supabase.from('maquininhas').select('id, nome, taxa_pix_maquina'),
        supabase.from('bandeiras').select('id, maquininha_id, nome'),
        supabase.from('taxas').select('*'),
        supabase.from('marcas_carros').select('*').order('nome'),
        supabase.from('modelos_carros').select('*').order('nome'),
      ]);
      setClientes(c.data || []);
      setFornecedores(f.data || []);
      setMaquininhas(m.data || []);
      setBandeiras(b.data || []);
      setTaxas(t.data || []);
      setMarcasList(mc.data || []);
      setModelosList(md.data || []);

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
          if (sv.carro_placa && !sv.cliente_cpf) {
            const { data: carData } = await supabase.from('carros').select('*').eq('placa', sv.carro_placa).single();
            if (carData) {
              setQuickCar({ marca: carData.marca || '', modelo: carData.modelo || '', placa: carData.placa });
            }
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
  const needsBandeira = (tipo: string) => !['Pix CNPJ', 'Dinheiro', 'Pix Máquina'].includes(tipo);

  const getTaxRate = (tipo: string, maquininha_id: string, bandeira_id: string, parcelas: number) => {
    if (tipo === 'Pix CNPJ' || tipo === 'Dinheiro') return 0;
    
    // Pix Máquina uses machine-level tax
    if (tipo === 'Pix Máquina') {
      const maq = maquininhas.find(m => m.id === maquininha_id);
      return maq ? Number(maq.taxa_pix_maquina) || 0 : 0;
    }

    let tipoDb = '';
    if (tipo === 'Débito') tipoDb = 'debito';
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
      const rate = getTaxRate(p.tipo, p.maquininha_id, p.bandeira_id, parseInt(p.parcelas) || 0);
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

      const isQuickFlow = (quickMode && !isEdit) || (isEdit && !form.cliente_cpf && !showClientFields);
      let carroPlaca = form.carro_placa || null;

      if (quickCar.placa.trim()) {
        const formattedPlaca = quickCar.placa.toUpperCase();
        if (showClientFields && form.cliente_cpf) {
          await supabase.from('carros').upsert({
            placa: formattedPlaca,
            marca: quickCar.marca,
            modelo: quickCar.modelo,
            cliente_cpf: form.cliente_cpf,
          }, { onConflict: 'placa' });
          carroPlaca = formattedPlaca;
        } else if (isQuickFlow) {
          await supabase.from('carros').upsert({
            placa: formattedPlaca,
            marca: quickCar.marca,
            modelo: quickCar.modelo,
            cliente_cpf: null,
          }, { onConflict: 'placa' });
          carroPlaca = formattedPlaca;
        }
      }

      if (showClientFields && form.carro_placa) {
        carroPlaca = form.carro_placa;
      }

      const dataEnc = form.status === 'entregue' && !form.data_encerramento
        ? new Date().toISOString().split('T')[0] : form.data_encerramento || null;

      const servicoData = {
        id,
        cliente_cpf: form.cliente_cpf || null,
        carro_placa: carroPlaca,
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
            taxa_aplicada: getTaxRate(p.tipo, p.maquininha_id, p.bandeira_id, parseInt(p.parcelas) || 0),
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!serviceId) return;
    try {
      await supabase.from('servicos_itens').delete().eq('servico_id', serviceId);
      await supabase.from('servicos_pagamentos').delete().eq('servico_id', serviceId);
      await supabase.from('servicos_custos').delete().eq('servico_id', serviceId);
      await supabase.from('servicos').delete().eq('id', serviceId);
      toast.success('Serviço excluído!');
      onClose();
    } catch {
      toast.error('Erro ao excluir serviço');
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle>
            {isEdit 
              ? (isEdit && !form.cliente_cpf && !showClientFields ? 'Editar Serviço Rápido' : 'Editar Serviço')
              : (quickMode ? 'Serviço Rápido' : 'Novo Serviço')}
          </DialogTitle>
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
            {(() => {
              const isQuickCreate = quickMode && !isEdit;
              const isQuickEdit = isEdit && !form.cliente_cpf && !showClientFields;
              return !isQuickCreate && !isQuickEdit;
            })() && (
              <>
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
              </>
            )}
            {(() => {
              const isQuickCreate = quickMode && !isEdit;
              const isQuickEdit = isEdit && !form.cliente_cpf && !showClientFields;
              return isQuickCreate || isQuickEdit;
            })() && (
              <div className="col-span-1 sm:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">Carro (opcional)</Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Marca</Label>
                    <AutocompleteInput value={quickCar.marca} onChange={v => setQuickCar({ ...quickCar, marca: v })}
                      suggestions={marcasList.map(m => m.nome)}
                      placeholder="Ex: Fiat" className="bg-card border-border" />
                  </div>
                  <div>
                    <Label className="text-xs">Modelo</Label>
                    <AutocompleteInput value={quickCar.modelo} onChange={v => setQuickCar({ ...quickCar, modelo: v })}
                      suggestions={(() => {
                        const marca = marcasList.find(m => m.nome.toLowerCase() === quickCar.marca.trim().toLowerCase());
                        return marca ? modelosList.filter(md => md.marca_id === marca.id).map(md => md.nome) : modelosList.map(md => md.nome);
                      })()}
                      placeholder="Ex: Uno" className="bg-card border-border" />
                  </div>
                  <div>
                    <Label className="text-xs">Placa</Label>
                    <Input value={quickCar.placa} onChange={e => setQuickCar({ ...quickCar, placa: formatPlaca(e.target.value) })}
                      placeholder="ABC-1234" className="bg-card border-border" />
                  </div>
                </div>
              </div>
            )}
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
              <CurrencyInput value={form.valor_total} onChange={v => setForm({ ...form, valor_total: v })} className="bg-card border-border" />
            </div>
            <div>
              <Label>Valor Líquido</Label>
              <CurrencyInput value={String(valorLiquido.toFixed(2))} onChange={() => {}} readOnly className="bg-card border-border" />
            </div>
          </div>

          {/* Costs - hidden by default */}
          <div>
            <Label className="mb-2 block">Custos</Label>
            {custos.length === 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setCustos([{ item: '', quantidade: '1', fornecedor_id: '', valor: '' }])}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Custo
              </Button>
            ) : (
              <>
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
                      <CurrencyInput value={c.valor} onChange={v => { const n = [...custos]; n[i].valor = v; setCustos(n); }}
                        className="bg-background border-border" />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setCustos(custos.filter((_, j) => j !== i))}>
                      <X className="w-4 h-4 mr-1" /> Remover
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setCustos([...custos, { item: '', quantidade: '1', fornecedor_id: '', valor: '' }])}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Custo
                </Button>
                <p className="text-sm text-muted-foreground mt-1">Total de Custos: {formatCurrency(custoTotal)}</p>
              </>
            )}
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

                  {needsBandeira(p.tipo) && p.maquininha_id && (
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

                  <CurrencyInput
                    value={p.valor}
                    onChange={v => { const n = [...pagamentos]; n[i].valor = v; setPagamentos(n); }}
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

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4 border-t border-border">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {isEdit && (
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="w-full sm:w-auto">
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </Button>
              )}
              {isEdit && !form.cliente_cpf && !showClientFields && (
                <Button variant="outline" onClick={() => setShowClientFields(true)} className="w-full sm:w-auto border-primary/50 text-primary hover:bg-primary/10">
                  <UserPlus className="w-4 h-4 mr-2" /> Atribuir Cliente
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancelar</Button>
              <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Salvando...' : 'Salvar Serviço'}
              </Button>
            </div>
          </div>
        </div>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent className="bg-popover border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
              <AlertDialogDescription>Deseja excluir essa entrada permanentemente?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Não</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sim</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
