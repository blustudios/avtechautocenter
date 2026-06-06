import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Skeleton } from '@/components/ui/skeleton';
import { tiposPagamento, formatCurrency } from '@/lib/format';
import {
  needsMaquininha, needsBandeira, needsParcelas, getTaxRate, calcPaymentStatus,
  type MaquininhaRef, type TaxaRef,
} from '@/lib/payments';
import { toast } from 'sonner';

interface Maquininha extends MaquininhaRef { id: string; nome: string; taxa_pix_maquina: number }
interface Bandeira { id: string; nome: string; maquininha_id: string }

interface Props {
  pagamentoId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPagamentoDialog({ pagamentoId, open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [servicoId, setServicoId] = useState<string>('');
  const [maquininhas, setMaquininhas] = useState<Maquininha[]>([]);
  const [bandeiras, setBandeiras] = useState<Bandeira[]>([]);
  const [taxas, setTaxas] = useState<TaxaRef[]>([]);

  const [tipo, setTipo] = useState('A Definir');
  const [maquininhaId, setMaquininhaId] = useState('');
  const [bandeiraId, setBandeiraId] = useState('');
  const [parcelas, setParcelas] = useState('');
  const [valor, setValor] = useState('0');
  const [dataPagamento, setDataPagamento] = useState('');
  const [pago, setPago] = useState(false);

  useEffect(() => {
    if (!open || !pagamentoId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [{ data: maqs }, { data: bands }, { data: txs }, { data: pg }] = await Promise.all([
        supabase.from('maquininhas').select('id, nome, taxa_pix_maquina').order('nome'),
        supabase.from('bandeiras').select('id, nome, maquininha_id').order('nome'),
        supabase.from('taxas').select('bandeira_id, tipo_pagamento, percentual, parcelas_de, parcelas_ate'),
        supabase.from('servicos_pagamentos').select('*').eq('id', pagamentoId).maybeSingle(),
      ]);
      if (cancelled) return;
      setMaquininhas((maqs as any) || []);
      setBandeiras((bands as any) || []);
      setTaxas((txs as any) || []);
      if (pg) {
        setServicoId(pg.servico_id);
        setTipo(pg.tipo || 'A Definir');
        setMaquininhaId(pg.maquininha_id || '');
        setBandeiraId(pg.bandeira_id || '');
        setParcelas(pg.parcelas ? String(pg.parcelas) : '');
        setValor(String(pg.valor ?? '0'));
        setDataPagamento(pg.data_pagamento || '');
        setPago(!!pg.pago);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [pagamentoId, open]);

  const taxaAplicada = getTaxRate(tipo, maquininhaId, bandeiraId, parseInt(parcelas) || 0, maquininhas, taxas);
  const valorNum = parseFloat(valor) || 0;
  const valorLiquido = valorNum * (1 - taxaAplicada / 100);

  const handleTipoChange = (v: string) => {
    setTipo(v);
    setMaquininhaId('');
    setBandeiraId('');
    if (v !== 'Crédito Parcelado') setParcelas('');
  };

  const validate = (): string | null => {
    if (!tipo) return 'Selecione o tipo de pagamento.';
    if (valorNum <= 0) return 'Valor deve ser maior que zero.';
    if (needsMaquininha(tipo) && !maquininhaId) return 'Selecione a maquininha.';
    if (needsBandeira(tipo) && !bandeiraId) return 'Selecione a bandeira.';
    if (needsParcelas(tipo) && !(parseInt(parcelas) >= 1)) return 'Informe o número de parcelas.';
    if (pago && !dataPagamento) return 'Pagamentos marcados como pagos exigem data.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!pagamentoId) return;
    setSaving(true);
    try {
      const { error: updErr } = await supabase
        .from('servicos_pagamentos')
        .update({
          tipo,
          maquininha_id: maquininhaId || null,
          bandeira_id: bandeiraId || null,
          parcelas: parcelas ? parseInt(parcelas) : null,
          valor: valorNum,
          taxa_aplicada: taxaAplicada,
          data_pagamento: dataPagamento || null,
          pago,
        })
        .eq('id', pagamentoId);
      if (updErr) throw updErr;

      // Recalcular status_pagamento do serviço
      const { data: allPg } = await supabase
        .from('servicos_pagamentos')
        .select('pago, data_pagamento')
        .eq('servico_id', servicoId);
      const novoStatus = calcPaymentStatus((allPg as any) || []);

      const { data: srv } = await supabase
        .from('servicos')
        .select('status_pagamento')
        .eq('id', servicoId)
        .maybeSingle();
      if (srv && srv.status_pagamento !== novoStatus) {
        await supabase.from('servicos').update({ status_pagamento: novoStatus }).eq('id', servicoId);
      }

      await supabase.from('servicos_historico').insert({
        servico_id: servicoId,
        campo: 'pagamento_editado_relatorio',
        valor_anterior: null,
        valor_novo: `Pagamento ${pagamentoId.slice(0, 8)} editado (${tipo} • ${formatCurrency(valorNum)} • ${pago ? 'Pago' : 'Pendente'})`,
      });

      toast.success('Pagamento atualizado');
      onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error('Falha ao salvar: ' + (e?.message || 'erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar pagamento{servicoId ? ` — Serviço ${servicoId}` : ''}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Tipo</Label>
                <Select value={tipo} onValueChange={handleTipoChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tiposPagamento.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {needsMaquininha(tipo) && (
                <div className="col-span-2">
                  <Label className="text-xs">Maquininha</Label>
                  <Select value={maquininhaId} onValueChange={v => { setMaquininhaId(v); setBandeiraId(''); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{maquininhas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {needsBandeira(tipo) && maquininhaId && (
                <div className="col-span-2">
                  <Label className="text-xs">Bandeira</Label>
                  <Select value={bandeiraId} onValueChange={setBandeiraId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {bandeiras.filter(b => b.maquininha_id === maquininhaId).map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsParcelas(tipo) && (
                <div>
                  <Label className="text-xs">Parcelas</Label>
                  <Input type="number" min={1} value={parcelas} onChange={e => setParcelas(e.target.value)} />
                </div>
              )}

              <div className={needsParcelas(tipo) ? '' : 'col-span-2'}>
                <Label className="text-xs">Valor</Label>
                <CurrencyInput value={valor} onChange={setValor} />
              </div>

              <div className="col-span-2">
                <Label className="text-xs">Data Pagamento</Label>
                <Input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} />
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-1">
                <Checkbox id="pago" checked={pago} onCheckedChange={(c) => setPago(!!c)} />
                <Label htmlFor="pago" className="cursor-pointer">Marcar como pago</Label>
              </div>
            </div>

            <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Taxa aplicada</span><span>{taxaAplicada.toFixed(2)}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor líquido</span><span className="font-medium text-status-pago">{formatCurrency(valorLiquido)}</span></div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
