import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Plus, X, Trash2, Car, Info, Wrench, DollarSign, CreditCard, ClipboardList, CircleDot, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { PneuSelectorDialog } from '@/components/services/PneuSelectorDialog';
import { StatusBadge, PaymentBadge } from '@/components/StatusBadge';
import { formatCurrency, formatPlaca, tiposPagamento, statusLabels } from '@/lib/format';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  serviceId?: string;
  defaultClienteCpf?: string;
  initialStatus?: 'orcamento' | 'em_progresso';
  quickMode?: boolean;
  onClose: () => void;
}

interface PneuItem {
  pneu_id: string;
  quantidade: number;
  valor_unitario: number;
  nome_display: string;
  baixa_estoque?: boolean;
}

export function ServiceDialog({ open, serviceId, defaultClienteCpf, initialStatus = 'em_progresso', quickMode, onClose }: Props) {
  const isEdit = !!serviceId;
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [carros, setCarros] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [maquininhas, setMaquininhas] = useState<any[]>([]);
  const [bandeiras, setBandeiras] = useState<any[]>([]);
  const [taxas, setTaxas] = useState<any[]>([]);
  const [marcasList, setMarcasList] = useState<{ id: string; nome: string }[]>([]);
  const [modelosList, setModelosList] = useState<{ id: string; marca_id: string; nome: string }[]>([]);
  const [pneusServico, setPneusServico] = useState<PneuItem[]>([]);
  const [showPneuSelector, setShowPneuSelector] = useState(false);
  const [showFinalizationError, setShowFinalizationError] = useState<string[] | null>(null);
  const [showLucroWarning, setShowLucroWarning] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  const [form, setForm] = useState({
    id: '',
    cliente_cpf: '',
    carro_placa: '',
    data_entrada: new Date().toISOString().split('T')[0],
    data_encerramento: '',
    data_orcamento: new Date().toISOString().split('T')[0],
    status: initialStatus as string,
    status_pagamento: 'pendente',
    valor_total: '',
    observacoes: '',
    is_servico_rapido: quickMode || false,
    carro_marca_livre: '',
    carro_modelo_livre: '',
    carro_placa_livre: '',
  });

  const [itens, setItens] = useState<{ descricao: string }[]>([{ descricao: '' }]);
  const [pagamentos, setPagamentos] = useState<{
    tipo: string; maquininha_id: string; bandeira_id: string; parcelas: string; valor: string; data_pagamento: string; pago: boolean;
  }[]>([]);
  const [custos, setCustos] = useState<{
    item: string; quantidade: string; fornecedor_id: string; valor: string; data_compra: string;
  }[]>([]);

  const isOrcamento = form.status === 'orcamento';
  const isEmProgresso = form.status === 'em_progresso';

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
          setOriginalData(sv);
          setForm({
            id: sv.id,
            cliente_cpf: sv.cliente_cpf || '',
            carro_placa: sv.carro_placa || '',
            data_entrada: sv.data_entrada,
            data_encerramento: sv.data_encerramento || '',
            data_orcamento: (sv as any).data_orcamento || '',
            status: sv.status,
            status_pagamento: sv.status_pagamento,
            valor_total: String(sv.valor_total),
            observacoes: sv.observacoes || '',
            is_servico_rapido: (sv as any).is_servico_rapido || false,
            carro_marca_livre: (sv as any).carro_marca_livre || '',
            carro_modelo_livre: (sv as any).carro_modelo_livre || '',
            carro_placa_livre: (sv as any).carro_placa_livre || '',
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
            data_pagamento: p.data_pagamento || '', pago: p.pago ?? false,
          })));
          const { data: ct } = await supabase.from('servicos_custos').select('*').eq('servico_id', serviceId);
          if (ct?.length) setCustos(ct.map((c: any) => ({
            item: c.item, quantidade: String(c.quantidade),
            fornecedor_id: c.fornecedor_id || '', valor: String(c.valor),
            data_compra: c.data_compra || sv.data_entrada,
          })));
          const { data: pn } = await supabase.from('servicos_pneus').select('*, estoque_pneus(marca, medida_01, medida_02, aro)').eq('servico_id', serviceId);
          if (pn?.length) {
            setPneusServico(pn.map((p: any) => ({
              pneu_id: p.pneu_id, quantidade: p.quantidade,
              valor_unitario: Number(p.valor_unitario),
              nome_display: p.estoque_pneus ? `${p.estoque_pneus.marca} ${p.estoque_pneus.medida_01}/${p.estoque_pneus.medida_02} ${p.estoque_pneus.aro}` : 'Pneu',
              baixa_estoque: p.baixa_estoque,
            })));
          }
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
      supabase.from('carros').select('*').eq('cliente_cpf', form.cliente_cpf).eq('ativo', true)
        .then(({ data }) => {
          setCarros(data || []);
          if (data && data.length === 1 && !isEdit) {
            setForm(f => ({ ...f, carro_placa: data[0].placa }));
          }
        });
    } else {
      setCarros([]);
    }
  }, [form.cliente_cpf]);

  const needsMaquininha = (tipo: string) => !['Pix CNPJ', 'Dinheiro', 'A Definir'].includes(tipo);
  const needsBandeira = (tipo: string) => !['Pix CNPJ', 'Dinheiro', 'Pix Máquina', 'A Definir'].includes(tipo);

  const getTaxRate = (tipo: string, maquininha_id: string, bandeira_id: string, parcelas: number) => {
    if (tipo === 'Pix CNPJ' || tipo === 'Dinheiro' || tipo === 'A Definir') return 0;
    if (tipo === 'Pix Máquina') {
      const maq = maquininhas.find(m => m.id === maquininha_id);
      return maq ? Number(maq.taxa_pix_maquina) || 0 : 0;
    }
    let tipoDb = '';
    if (tipo === 'Débito') tipoDb = 'debito';
    else if (tipo === 'Crédito à vista') tipoDb = 'credito_avista';
    else if (tipo === 'Crédito Parcelado') tipoDb = 'credito_parcelado';
    if (tipoDb === 'credito_parcelado') {
      const tx = taxas.find(t => t.bandeira_id === bandeira_id && t.tipo_pagamento === tipoDb &&
        parcelas >= (t.parcelas_de || 0) && parcelas <= (t.parcelas_ate || 999));
      return tx ? Number(tx.percentual) : 0;
    }
    const tx = taxas.find(t => t.bandeira_id === bandeira_id && t.tipo_pagamento === tipoDb);
    return tx ? Number(tx.percentual) : 0;
  };

  const calcPaymentStatus = () => {
    if (pagamentos.length === 0) return 'pendente';
    const allPago = pagamentos.every(p => p.pago);
    if (allPago) return 'pago';
    const today = new Date().toISOString().split('T')[0];
    const hasOverdue = pagamentos.some(p => !p.pago && p.data_pagamento && p.data_pagamento < today);
    if (hasOverdue) return 'em_atraso';
    const hasPago = pagamentos.some(p => p.pago);
    const hasUnpaid = pagamentos.some(p => !p.pago);
    if (hasPago && hasUnpaid) return 'pendente_parcial';
    return 'pendente';
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
  const lucroLiquido = isOrcamento
    ? (parseFloat(form.valor_total) || 0) - custoTotal
    : valorLiquido - custoTotal;

  const logHistory = async (id: string, campo: string, anterior: string | null, novo: string | null) => {
    if (anterior === novo) return;
    await supabase.from('servicos_historico').insert({
      servico_id: id, campo, valor_anterior: anterior, valor_novo: novo,
    });
  };

  const handleSave = async (finalizeAfter = false) => {
    setLoading(true);
    try {
      let id = form.id;
      if (!isEdit) {
        const { data } = await supabase.rpc('generate_service_id');
        id = data as string;
      }

      const servicoData: any = {
        id,
        cliente_cpf: form.cliente_cpf || null,
        carro_placa: form.carro_placa || null,
        data_entrada: form.data_entrada || new Date().toISOString().split('T')[0],
        data_encerramento: form.data_encerramento || null,
        data_orcamento: isOrcamento ? form.data_orcamento : (originalData?.data_orcamento || null),
        status: finalizeAfter ? 'finalizado' : form.status,
        status_pagamento: isOrcamento ? 'pendente' : calcPaymentStatus(),
        valor_total: parseFloat(form.valor_total) || 0,
        valor_liquido: isOrcamento ? 0 : valorLiquido,
        custo_total: custoTotal,
        lucro_liquido: isOrcamento ? 0 : (valorLiquido - custoTotal),
        observacoes: form.observacoes || null,
        is_servico_rapido: form.is_servico_rapido,
        carro_marca_livre: form.carro_marca_livre || null,
        carro_modelo_livre: form.carro_modelo_livre || null,
        carro_placa_livre: form.carro_placa_livre || null,
        // legacy compat
        carro_marca: form.carro_marca_livre || null,
        carro_modelo: form.carro_modelo_livre || null,
      };

      if (finalizeAfter) {
        servicoData.data_encerramento = new Date().toISOString().split('T')[0];
      }

      if (isEdit) {
        await supabase.from('servicos').update(servicoData).eq('id', id);
        // Log changes
        if (originalData) {
          if (originalData.status !== servicoData.status) await logHistory(id, 'status', originalData.status, servicoData.status);
          if (String(originalData.valor_total) !== String(servicoData.valor_total)) await logHistory(id, 'valor_total', String(originalData.valor_total), String(servicoData.valor_total));
          if (originalData.data_entrada !== servicoData.data_entrada) await logHistory(id, 'data_entrada', originalData.data_entrada, servicoData.data_entrada);
        }
        await supabase.from('servicos_itens').delete().eq('servico_id', id);
        await supabase.from('servicos_pagamentos').delete().eq('servico_id', id);
        await supabase.from('servicos_custos').delete().eq('servico_id', id);
        const { data: oldPneus } = await supabase.from('servicos_pneus').select('*').eq('servico_id', id);
        if (oldPneus?.length) {
          for (const op of oldPneus) {
            if (op.baixa_estoque) {
              const { data: currentPneu } = await supabase.from('estoque_pneus').select('quantidade').eq('id', op.pneu_id).single();
              if (currentPneu) {
                await supabase.from('estoque_pneus').update({ quantidade: currentPneu.quantidade + op.quantidade }).eq('id', op.pneu_id);
              }
            }
          }
        }
        await supabase.from('servicos_pneus').delete().eq('servico_id', id);
      } else {
        await supabase.from('servicos').insert(servicoData);
      }

      const validItens = itens.filter(i => i.descricao.trim());
      if (validItens.length) {
        await supabase.from('servicos_itens').insert(validItens.map((i, idx) => ({ servico_id: id, descricao: i.descricao, ordem: idx })));
      }

      if (!isOrcamento) {
        const validPag = pagamentos.filter(p => p.tipo && parseFloat(p.valor));
        if (validPag.length) {
          await supabase.from('servicos_pagamentos').insert(validPag.map(p => ({
            servico_id: id, tipo: p.tipo, maquininha_id: p.maquininha_id || null,
            bandeira_id: p.bandeira_id || null, parcelas: p.parcelas ? parseInt(p.parcelas) : null,
            valor: parseFloat(p.valor) || 0, taxa_aplicada: getTaxRate(p.tipo, p.maquininha_id, p.bandeira_id, parseInt(p.parcelas) || 0),
            data_pagamento: p.data_pagamento || null, pago: p.pago,
          })));
        }
      }

      const validCustos = custos.filter(c => c.item.trim());
      if (validCustos.length) {
        await supabase.from('servicos_custos').insert(validCustos.map(c => ({
          servico_id: id, item: c.item, quantidade: parseFloat(c.quantidade) || 1,
          fornecedor_id: c.fornecedor_id || null, valor: parseFloat(c.valor) || 0,
          data_compra: isOrcamento ? null : (c.data_compra || form.data_entrada),
        })));
      }

      if (pneusServico.length) {
        const shouldDeduct = finalizeAfter || form.status === 'finalizado';
        await supabase.from('servicos_pneus').insert(pneusServico.map(p => ({
          servico_id: id, pneu_id: p.pneu_id, quantidade: p.quantidade,
          valor_unitario: p.valor_unitario, baixa_estoque: shouldDeduct,
        })));
        if (shouldDeduct) {
          for (const p of pneusServico) {
            const { data: currentPneu } = await supabase.from('estoque_pneus').select('quantidade').eq('id', p.pneu_id).single();
            if (currentPneu) {
              await supabase.from('estoque_pneus').update({ quantidade: Math.max(0, currentPneu.quantidade - p.quantidade) }).eq('id', p.pneu_id);
            }
          }
        }
      }

      toast.success(isEdit ? 'Serviço atualizado!' : 'Serviço criado!');
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar serviço');
    }
    setLoading(false);
  };

  const handleExecuteService = async () => {
    setForm(f => ({ ...f, status: 'em_progresso', data_entrada: f.data_entrada || new Date().toISOString().split('T')[0] }));
    // Save with status change
    setLoading(true);
    try {
      let id = form.id;
      if (!isEdit) {
        const { data } = await supabase.rpc('generate_service_id');
        id = data as string;
      }
      const servicoData: any = {
        id,
        cliente_cpf: form.cliente_cpf || null,
        carro_placa: form.carro_placa || null,
        data_entrada: form.data_entrada || new Date().toISOString().split('T')[0],
        data_encerramento: null,
        data_orcamento: form.data_orcamento || null,
        status: 'em_progresso',
        status_pagamento: 'pendente',
        valor_total: parseFloat(form.valor_total) || 0,
        valor_liquido: 0,
        custo_total: custoTotal,
        lucro_liquido: 0,
        observacoes: form.observacoes || null,
        is_servico_rapido: form.is_servico_rapido,
        carro_marca_livre: form.carro_marca_livre || null,
        carro_modelo_livre: form.carro_modelo_livre || null,
        carro_placa_livre: form.carro_placa_livre || null,
        carro_marca: form.carro_marca_livre || null,
        carro_modelo: form.carro_modelo_livre || null,
      };
      if (isEdit) {
        await supabase.from('servicos').update(servicoData).eq('id', id);
        await logHistory(id, 'status', 'orcamento', 'em_progresso');
      } else {
        await supabase.from('servicos').insert(servicoData);
      }
      // Save itens
      if (isEdit) await supabase.from('servicos_itens').delete().eq('servico_id', id);
      const validItens = itens.filter(i => i.descricao.trim());
      if (validItens.length) {
        await supabase.from('servicos_itens').insert(validItens.map((i, idx) => ({ servico_id: id, descricao: i.descricao, ordem: idx })));
      }
      // Save custos
      if (isEdit) await supabase.from('servicos_custos').delete().eq('servico_id', id);
      const validCustos = custos.filter(c => c.item.trim());
      if (validCustos.length) {
        await supabase.from('servicos_custos').insert(validCustos.map(c => ({
          servico_id: id, item: c.item, quantidade: parseFloat(c.quantidade) || 1,
          fornecedor_id: c.fornecedor_id || null, valor: parseFloat(c.valor) || 0,
          data_compra: form.data_entrada || new Date().toISOString().split('T')[0],
        })));
      }
      toast.success('Serviço iniciado!');
      onClose();
    } catch {
      toast.error('Erro ao executar serviço');
    }
    setLoading(false);
  };

  const attemptFinalize = () => {
    // Step 1: check lucro
    if (lucroLiquido <= 0) {
      setShowLucroWarning(true);
      return;
    }
    runFinalizationChecks();
  };

  const runFinalizationChecks = () => {
    const errors: string[] = [];
    if (!form.data_entrada) errors.push('📅 Data de Entrada não preenchida. Preencha a data em que o carro entrou na oficina.');
    const validItens = itens.filter(i => i.descricao.trim());
    if (validItens.length === 0) errors.push('🔧 Nenhum serviço descrito. Adicione ao menos uma linha na seção Descrição dos Serviços.');
    const validCustos = custos.filter(c => c.item.trim());
    if (validCustos.length > 0 && validCustos.some(c => !c.data_compra)) {
      errors.push('🧾 Um ou mais itens de custo estão sem data de compra. Preencha as datas na seção Custos.');
    }
    if (pagamentos.some(p => !p.pago)) {
      errors.push('💳 Uma ou mais formas de pagamento não foram marcadas como pagas. Marque todos os pagamentos como Pago na seção Pagamentos.');
    }

    if (errors.length > 0) {
      setShowFinalizationError(errors);
      return;
    }

    handleSave(true);
  };

  const clienteSearch = useMemo(() => {
    return clientes.map(c => ({ label: `${c.nome} · ${c.cpf}`, value: c.cpf }));
  }, [clientes]);

  const SectionTitle = ({ icon: Icon, title, extra }: { icon: any; title: string; extra?: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
      {extra}
    </div>
  );

  const dialogTitle = isEdit
    ? `Editar Serviço`
    : quickMode
      ? 'Novo Serviço Rápido'
      : isOrcamento
        ? 'Novo Orçamento'
        : 'Novo Serviço';

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-popover border-border w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Section: Informações Gerais */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <SectionTitle icon={Info} title="Informações Gerais" extra={<StatusBadge status={form.status} />} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isEdit && (
                <div>
                  <Label>ID do Serviço</Label>
                  <Input value={form.id} readOnly className="bg-card border-border" />
                </div>
              )}

              {/* Quick mode: free text car fields */}
              {quickMode && !isEdit ? (
                <div className="col-span-1 sm:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-semibold">Veículo</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Marca</Label>
                      <AutocompleteInput value={form.carro_marca_livre} onChange={v => setForm({ ...form, carro_marca_livre: v })}
                        suggestions={marcasList.map(m => m.nome)} placeholder="Ex: Fiat" className="bg-card border-border" />
                    </div>
                    <div>
                      <Label className="text-xs">Modelo</Label>
                      <AutocompleteInput value={form.carro_modelo_livre} onChange={v => setForm({ ...form, carro_modelo_livre: v })}
                        suggestions={(() => {
                          const marca = marcasList.find(m => m.nome.toLowerCase() === form.carro_marca_livre.trim().toLowerCase());
                          return marca ? modelosList.filter(md => md.marca_id === marca.id).map(md => md.nome) : modelosList.map(md => md.nome);
                        })()}
                        placeholder="Ex: Uno" className="bg-card border-border" />
                    </div>
                    <div>
                      <Label className="text-xs">Placa</Label>
                      <Input value={form.carro_placa_livre} onChange={e => setForm({ ...form, carro_placa_livre: formatPlaca(e.target.value) })}
                        placeholder="ABC-1234" className="bg-card border-border" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Cliente</Label>
                    <Select value={form.cliente_cpf} onValueChange={v => setForm({ ...form, cliente_cpf: v, carro_placa: '' })}>
                      <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {clientes.map(c => <SelectItem key={c.cpf} value={c.cpf}>{c.nome} · {c.cpf}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Carro</Label>
                    <Select value={form.carro_placa} onValueChange={v => setForm({ ...form, carro_placa: v })}>
                      <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{carros.map(c => <SelectItem key={c.placa} value={c.placa}>{c.marca} {c.modelo} · {c.placa}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {isOrcamento && (
                <div>
                  <Label>Data do Orçamento</Label>
                  <Input type="date" value={form.data_orcamento} onChange={e => setForm({ ...form, data_orcamento: e.target.value })} className="bg-card border-border" />
                </div>
              )}
              {isEmProgresso && (
                <div>
                  <Label>Data de Entrada</Label>
                  <Input type="date" value={form.data_entrada} onChange={e => setForm({ ...form, data_entrada: e.target.value })} className="bg-card border-border" />
                </div>
              )}
            </div>
          </div>

          {/* Section: Descrição dos Serviços */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <SectionTitle icon={Wrench} title="Descrição dos Serviços" />
            {itens.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input value={item.descricao} onChange={e => { const n = [...itens]; n[i].descricao = e.target.value; setItens(n); }}
                  placeholder="Ex: Troca de pneus 205/55R16" className="bg-card border-border flex-1" />
                {itens.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setItens(itens.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>
                )}
              </div>
            ))}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="ghost" size="sm" onClick={() => setItens([...itens, { descricao: '' }])}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowPneuSelector(true)} className="text-primary">
                <CircleDot className="w-4 h-4 mr-1" /> Adicionar Pneus
              </Button>
            </div>
            {pneusServico.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <Label className="text-xs text-muted-foreground">Pneus adicionados:</Label>
                {pneusServico.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-card border border-border rounded-md px-3 py-2 text-sm">
                    <span className="text-foreground">{p.quantidade}x {p.nome_display}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{formatCurrency(p.valor_unitario * p.quantidade)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPneusServico(pneusServico.filter((_, j) => j !== i))}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Valores */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <SectionTitle icon={DollarSign} title="Valores" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Valor Total do Serviço (R$)</Label>
                <CurrencyInput value={form.valor_total} onChange={v => setForm({ ...form, valor_total: v })} className="bg-card border-border" />
              </div>
              {isEmProgresso && (
                <div>
                  <Label>Valor c/ Desconto das Taxas</Label>
                  <CurrencyInput value={String(valorLiquido.toFixed(2))} onChange={() => {}} readOnly className="bg-card border-border" />
                </div>
              )}
            </div>
          </div>

          {/* Section: Custos */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <SectionTitle icon={ClipboardList} title="Custos" />
            {custos.length === 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setCustos([{ item: '', quantidade: '1', fornecedor_id: '', valor: '', data_compra: form.data_entrada }])}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Custo
              </Button>
            ) : (
              <>
                {custos.map((c, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input value={c.item} onChange={e => { const n = [...custos]; n[i].item = e.target.value; setCustos(n); }}
                        placeholder="Item" className="bg-background border-border" />
                      <Select value={c.fornecedor_id} onValueChange={v => { const n = [...custos]; n[i].fornecedor_id = v; setCustos(n); }}>
                        <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
                        <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className={`grid gap-2 ${isOrcamento ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      <Input type="number" value={c.quantidade} onChange={e => { const n = [...custos]; n[i].quantidade = e.target.value; setCustos(n); }}
                        placeholder="Qtd" className="bg-background border-border" />
                      <CurrencyInput value={c.valor} onChange={v => { const n = [...custos]; n[i].valor = v; setCustos(n); }} className="bg-background border-border" />
                      {!isOrcamento && (
                        <Input type="date" value={c.data_compra} onChange={e => { const n = [...custos]; n[i].data_compra = e.target.value; setCustos(n); }}
                          className="bg-background border-border" />
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setCustos(custos.filter((_, j) => j !== i))}>
                      <X className="w-4 h-4 mr-1" /> Remover
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setCustos([...custos, { item: '', quantidade: '1', fornecedor_id: '', valor: '', data_compra: form.data_entrada }])}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Custo
                </Button>
                <p className="text-sm text-muted-foreground">Total de Custos: {formatCurrency(custoTotal)}</p>
              </>
            )}
          </div>

          {/* Section: Pagamentos - only for em_progresso */}
          {isEmProgresso && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Pagamentos</h3>
                <PaymentBadge status={calcPaymentStatus()} />
              </div>
              {pagamentos.length === 0 ? (
                <Button variant="ghost" size="sm" onClick={() => {
                  const valorAberto = Math.max(0, (parseFloat(form.valor_total) || 0)).toFixed(2);
                  setPagamentos([{ tipo: 'A Definir', maquininha_id: '', bandeira_id: '', parcelas: '', valor: valorAberto, data_pagamento: new Date().toISOString().split('T')[0], pago: false }]);
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Pagamento
                </Button>
              ) : (
                <>
                  {pagamentos.map((p, i) => (
                    <div key={i} className="bg-card border border-border rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        <Select value={p.tipo} onValueChange={v => {
                          const n = [...pagamentos]; n[i].tipo = v; n[i].maquininha_id = ''; n[i].bandeira_id = ''; setPagamentos(n);
                        }}>
                          <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Tipo" /></SelectTrigger>
                          <SelectContent>{tiposPagamento.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                        {needsMaquininha(p.tipo) && (
                          <Select value={p.maquininha_id} onValueChange={v => {
                            const n = [...pagamentos]; n[i].maquininha_id = v; n[i].bandeira_id = ''; setPagamentos(n);
                          }}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Maquininha" /></SelectTrigger>
                            <SelectContent>{maquininhas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                        {needsBandeira(p.tipo) && p.maquininha_id && (
                          <Select value={p.bandeira_id} onValueChange={v => {
                            const n = [...pagamentos]; n[i].bandeira_id = v; setPagamentos(n);
                          }}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Bandeira" /></SelectTrigger>
                            <SelectContent>{bandeiras.filter(b => b.maquininha_id === p.maquininha_id).map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                        {p.tipo === 'Crédito Parcelado' && (
                          <Input type="number" placeholder="Parcelas" value={p.parcelas}
                            onChange={e => { const n = [...pagamentos]; n[i].parcelas = e.target.value; setPagamentos(n); }}
                            className="bg-background border-border" />
                        )}
                        <CurrencyInput value={p.valor} onChange={v => { const n = [...pagamentos]; n[i].valor = v; setPagamentos(n); }}
                          placeholder="Valor (R$)" className="bg-background border-border" />
                        <Input type="date" value={p.data_pagamento}
                          onChange={e => { const n = [...pagamentos]; n[i].data_pagamento = e.target.value; setPagamentos(n); }}
                          className="bg-background border-border" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox id={`pago-${i}`} checked={p.pago}
                            onCheckedChange={(checked) => { const n = [...pagamentos]; n[i].pago = !!checked; setPagamentos(n); }}
                            className="rounded-full h-4 w-4" />
                          <label htmlFor={`pago-${i}`} className={`text-xs font-medium cursor-pointer select-none ${p.pago ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                            {p.pago ? 'Pago' : 'Pendente'}
                          </label>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-destructive" onClick={() => setPagamentos(pagamentos.filter((_, j) => j !== i))}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => {
                    const somaExistente = pagamentos.reduce((sum, pg) => sum + (parseFloat(pg.valor) || 0), 0);
                    const valorAberto = Math.max(0, (parseFloat(form.valor_total) || 0) - somaExistente).toFixed(2);
                    setPagamentos([...pagamentos, { tipo: 'A Definir', maquininha_id: '', bandeira_id: '', parcelas: '', valor: valorAberto, data_pagamento: new Date().toISOString().split('T')[0], pago: false }]);
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Pagamento
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Section: Resumo */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <SectionTitle icon={DollarSign} title="Resumo" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{isOrcamento ? 'Estimativa de Lucro' : 'Lucro Líquido'}</Label>
                <div className={`p-2 rounded border border-border text-lg font-semibold ${lucroLiquido >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {formatCurrency(lucroLiquido)}
                </div>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="bg-card border-border" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancelar</Button>

            {/* New orcamento */}
            {!isEdit && isOrcamento && (
              <Button onClick={() => handleSave()} disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? 'Salvando...' : 'Salvar Orçamento'}
              </Button>
            )}

            {/* Edit orcamento */}
            {isEdit && isOrcamento && (
              <>
                <Button onClick={() => handleSave()} disabled={loading} className="w-full sm:w-auto">
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button onClick={handleExecuteService} disabled={loading} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle className="w-4 h-4 mr-2" /> Executar Serviço
                </Button>
              </>
            )}

            {/* New/edit em_progresso */}
            {((!isEdit && !isOrcamento) || (isEdit && isEmProgresso)) && (
              <>
                <Button onClick={() => handleSave()} disabled={loading} className="w-full sm:w-auto">
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button onClick={attemptFinalize} disabled={loading} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle className="w-4 h-4 mr-2" /> Finalizar Serviço
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Finalization error dialog */}
        <AlertDialog open={!!showFinalizationError} onOpenChange={() => setShowFinalizationError(null)}>
          <AlertDialogContent className="bg-popover border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Não foi possível finalizar o serviço</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  {showFinalizationError?.map((err, i) => (
                    <p key={i} className="text-sm">{err}</p>
                  ))}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowFinalizationError(null)}>Entendido, vou corrigir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Lucro warning dialog */}
        <AlertDialog open={showLucroWarning} onOpenChange={setShowLucroWarning}>
          <AlertDialogContent className="bg-popover border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>⚠️ Atenção: Lucro Negativo ou Zero</AlertDialogTitle>
              <AlertDialogDescription>
                O Lucro Líquido deste serviço está zerado ou negativo. Isso pode indicar que algum valor não foi preenchido corretamente. Confirma que os valores estão corretos e deseja finalizar mesmo assim?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowLucroWarning(false)}>Não, revisar valores</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setShowLucroWarning(false); runFinalizationChecks(); }}>
                Sim, está correto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>

      <PneuSelectorDialog open={showPneuSelector} onClose={() => setShowPneuSelector(false)}
        onSelect={(pneu) => setPneusServico([...pneusServico, pneu])} />
    </Dialog>
  );
}
