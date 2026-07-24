import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useCategorias, useOrigens } from '@/hooks/financeiro/useFinanceiroData';
import { expandRecurrence, Frequencia } from '@/lib/financeiro/recurrence';
import { format, parseISO, startOfMonth } from 'date-fns';
import type { RecorrenciaItem } from '@/pages/financeiro/Recorrencias';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: RecorrenciaItem | null;
}

export function EditRecorrenciaDialog({ open, onOpenChange, item }: Props) {
  const qc = useQueryClient();
  const { data: categorias } = useCategorias();
  const { data: origens } = useOrigens();

  const [titulo, setTitulo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [origemId, setOrigemId] = useState<string>('');
  const [valorPrevisto, setValorPrevisto] = useState('0');
  const [frequencia, setFrequencia] = useState<Frequencia>('mensal');
  const [dataFim, setDataFim] = useState('');
  const [initialFreq, setInitialFreq] = useState<Frequencia>('mensal');
  const [initialDataFim, setInitialDataFim] = useState('');

  const [askScope, setAskScope] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setTitulo(item.instance.descricao);
    setObservacoes(item.instance.observacoes || '');
    setCategoriaId(item.instance.categoria_id || '');
    setOrigemId(item.instance.origem_id || '');
    setValorPrevisto(String(item.instance.valor_previsto || 0));
    const freq = (item.rec.frequencia as Frequencia) || 'mensal';
    setFrequencia(freq);
    setInitialFreq(freq);
    setDataFim(item.rec.data_fim || '');
    setInitialDataFim(item.rec.data_fim || '');
  }, [open, item]);

  if (!item) return null;

  const catsDisponiveis = (categorias || []).filter(c => c.nome !== 'Custos de Serviço');
  const origensSaida = (origens || []).filter(o => o.tipo === 'saida');

  const validate = () => {
    if (!titulo.trim()) { toast.error('Título obrigatório'); return false; }
    if (!dataFim) { toast.error('Data de encerramento obrigatória'); return false; }
    if (frequencia !== 'mensal' && frequencia !== 'anual') {
      toast.error('Escolha uma frequência válida'); return false;
    }
    return true;
  };

  const applyScope = async (scope: 'one' | 'forward') => {
    if (!item) return;
    setSaving(true);
    try {
      const commonUpdate: any = {
        descricao: titulo.trim(),
        observacoes: observacoes.trim() || null,
        categoria_id: categoriaId || null,
        origem_id: origemId || null,
        valor_previsto: parseFloat(valorPrevisto) || 0,
      };

      if (scope === 'one') {
        const { error } = await supabase
          .from('financeiro_lancamentos')
          .update(commonUpdate)
          .eq('id', item.instance.id);
        if (error) throw error;
        toast.success('Ocorrência atualizada');
      } else {
        const freqChanged = frequencia !== initialFreq;
        const dataFimChanged = dataFim !== initialDataFim;

        if (freqChanged) {
          // Recomputar futuras: apagar existentes >= data da instância e recriar
          const startISO = item.instance.data;
          const { error: delErr } = await supabase
            .from('financeiro_lancamentos')
            .delete()
            .eq('recorrencia_id', item.rec.id)
            .gte('data', startISO);
          if (delErr) throw delErr;

          const datas = expandRecurrence(startISO, dataFim, frequencia);
          const vp = parseFloat(valorPrevisto) || 0;
          const rows = datas.map(d => ({
            tipo: 'saida' as const,
            data: d,
            descricao: titulo.trim(),
            observacoes: observacoes.trim() || null,
            categoria_id: categoriaId || null,
            origem_id: origemId || null,
            valor_previsto: vp,
            valor_realizado: 0,
            status_pagamento: 'a_pagar' as const,
            recorrencia_id: item.rec.id,
            is_auto: false,
            mes_referencia: format(startOfMonth(parseISO(d)), 'yyyy-MM-dd'),
          }));
          if (rows.length) {
            const { error: insErr } = await supabase.from('financeiro_lancamentos').insert(rows);
            if (insErr) throw insErr;
          }
        } else {
          // Atualiza somente os campos nas ocorrências >= data da instância
          const { error } = await supabase
            .from('financeiro_lancamentos')
            .update(commonUpdate)
            .eq('recorrencia_id', item.rec.id)
            .gte('data', item.instance.data);
          if (error) throw error;

          if (dataFimChanged) {
            // Se encurtou, apagar ocorrências futuras > novo data_fim
            const { error: delErr } = await supabase
              .from('financeiro_lancamentos')
              .delete()
              .eq('recorrencia_id', item.rec.id)
              .gt('data', dataFim);
            if (delErr) throw delErr;
          }
        }

        const { error: recErr } = await supabase
          .from('financeiro_recorrencias')
          .update({ frequencia, data_fim: dataFim })
          .eq('id', item.rec.id);
        if (recErr) throw recErr;

        toast.success('Recorrência atualizada');
      }

      qc.invalidateQueries({ queryKey: ['fin'] });
      setAskScope(false);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const onSaveClick = () => {
    if (!validate()) return;
    setAskScope(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-popover border-border">
          <DialogHeader>
            <DialogTitle>Editar recorrência</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={80} className="bg-card border-border" />
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
                <Label>Frequência</Label>
                <Select value={frequencia} onValueChange={(v: any) => setFrequencia(v)}>
                  <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                    {initialFreq === 'semanal' && <SelectItem value="semanal">Semanal (legado)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Data de encerramento</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-card border-border" />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} className="bg-card border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={onSaveClick} disabled={saving} className="bg-primary text-primary-foreground">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={askScope} onOpenChange={setAskScope}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar alterações a...</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha o escopo das alterações desta recorrência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <Button variant="outline" disabled={saving} onClick={() => applyScope('one')}>
              Somente esta ocorrência
            </Button>
            <AlertDialogAction disabled={saving} onClick={() => applyScope('forward')}>
              Esta e todas as futuras
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
