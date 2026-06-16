import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useCategorias, useOrigens, Lancamento } from '@/hooks/financeiro/useFinanceiroData';
import { useMonth } from '@/contexts/MonthContext';
import { toMesRef } from '@/lib/financeiro/dates';
import { expandRecurrence, Frequencia } from '@/lib/financeiro/recurrence';
import { startOfMonth, parseISO, format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  edit?: Lancamento | null;
}

export function LancamentoSaidaDialog({ open, onOpenChange, edit }: Props) {
  const qc = useQueryClient();
  const { month } = useMonth();
  const { data: categorias } = useCategorias();
  const { data: origens } = useOrigens();

  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [descricao, setDescricao] = useState('');
  const [origemId, setOrigemId] = useState<string>('');
  const [valorPrevisto, setValorPrevisto] = useState('0');
  const [valorRealizado, setValorRealizado] = useState('0');
  const [status, setStatus] = useState<'a_pagar' | 'agendado' | 'pago'>('a_pagar');
  const [recorrente, setRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState<Frequencia>('mensal');
  const [dataFim, setDataFim] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setData(edit.data);
      setCategoriaId(edit.categoria_id || '');
      setDescricao(edit.descricao);
      setOrigemId(edit.origem_id || '');
      setValorPrevisto(String(edit.valor_previsto));
      setValorRealizado(String(edit.valor_realizado));
      setStatus((edit.status_pagamento as any) || 'a_pagar');
      setRecorrente(false);
      setDataFim('');
    } else {
      setData(format(month, 'yyyy-MM-dd'));
      setCategoriaId('');
      setDescricao('');
      setOrigemId('');
      setValorPrevisto('0');
      setValorRealizado('0');
      setStatus('a_pagar');
      setRecorrente(false);
      setFrequencia('mensal');
      setDataFim('');
    }
  }, [open, edit, month]);

  const catsDisponiveis = (categorias || []).filter(c => c.nome !== 'Custos de Serviço');
  const origensSaida = (origens || []).filter(o => o.tipo === 'saida');

  const save = async () => {
    if (!descricao.trim()) { toast.error('Descrição obrigatória'); return; }
    if (!data) { toast.error('Data obrigatória'); return; }
    if (recorrente && !dataFim) { toast.error('Data final da recorrência obrigatória'); return; }

    setSaving(true);
    try {
      if (edit) {
        const { error } = await supabase.from('financeiro_lancamentos').update({
          data,
          descricao: descricao.trim(),
          categoria_id: categoriaId || null,
          origem_id: origemId || null,
          valor_previsto: parseFloat(valorPrevisto) || 0,
          valor_realizado: parseFloat(valorRealizado) || 0,
          status_pagamento: status,
          mes_referencia: format(startOfMonth(parseISO(data)), 'yyyy-MM-dd'),
        }).eq('id', edit.id);
        if (error) throw error;
        toast.success('Saída atualizada');
      } else if (recorrente) {
        const { data: rec, error: recErr } = await supabase.from('financeiro_recorrencias').insert({
          frequencia, data_inicio: data, data_fim: dataFim,
        }).select().single();
        if (recErr) throw recErr;
        const datas = expandRecurrence(data, dataFim, frequencia);
        const rows = datas.map(d => ({
          tipo: 'saida' as const,
          data: d,
          descricao: descricao.trim(),
          categoria_id: categoriaId || null,
          origem_id: origemId || null,
          valor_previsto: parseFloat(valorPrevisto) || 0,
          valor_realizado: 0,
          status_pagamento: 'a_pagar' as const,
          recorrencia_id: rec.id,
          is_auto: false,
          mes_referencia: format(startOfMonth(parseISO(d)), 'yyyy-MM-dd'),
        }));
        const { error } = await supabase.from('financeiro_lancamentos').insert(rows);
        if (error) throw error;
        toast.success(`${rows.length} lançamentos criados`);
      } else {
        const { error } = await supabase.from('financeiro_lancamentos').insert({
          tipo: 'saida',
          data,
          descricao: descricao.trim(),
          categoria_id: categoriaId || null,
          origem_id: origemId || null,
          valor_previsto: parseFloat(valorPrevisto) || 0,
          valor_realizado: parseFloat(valorRealizado) || 0,
          status_pagamento: status,
          is_auto: false,
          mes_referencia: format(startOfMonth(parseISO(data)), 'yyyy-MM-dd'),
        });
        if (error) throw error;
        toast.success('Saída registrada');
      }
      qc.invalidateQueries({ queryKey: ['fin'] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle>{edit ? 'Editar Saída' : 'Nova Saída'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded p-2">
            Custos já lançados dentro de um Serviço não devem ser cadastrados aqui — eles entram automaticamente na linha "Custos de Serviço".
          </p>
          <div>
            <Label>Data da saída</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} className="bg-card border-border" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {catsDisponiveis.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} className="bg-card border-border" />
          </div>
          <div>
            <Label>Origem da saída</Label>
            <Select value={origemId} onValueChange={setOrigemId}>
              <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {origensSaida.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor Previsto</Label>
              <CurrencyInput value={valorPrevisto} onChange={setValorPrevisto} />
            </div>
            <div>
              <Label>Valor Realizado</Label>
              <CurrencyInput value={valorRealizado} onChange={setValorRealizado} />
            </div>
          </div>
          <div>
            <Label>Status de Pagamento</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="a_pagar">A pagar</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!edit && (
            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="rec" checked={recorrente} onCheckedChange={v => setRecorrente(!!v)} />
                <Label htmlFor="rec" className="cursor-pointer">Recorrência</Label>
              </div>
              {recorrente && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Frequência</Label>
                    <Select value={frequencia} onValueChange={(v: any) => setFrequencia(v)}>
                      <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data final</Label>
                    <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-card border-border" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground">
            {saving ? 'Salvando...' : 'Salvar Saída'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
