import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useOrigens, Lancamento } from '@/hooks/financeiro/useFinanceiroData';
import { useMonth } from '@/contexts/MonthContext';
import { startOfMonth, parseISO, format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  edit?: Lancamento | null;
  initial?: Lancamento | null;
}

export function LancamentoEntradaDialog({ open, onOpenChange, edit, initial }: Props) {
  const qc = useQueryClient();
  const { month } = useMonth();
  const { data: origens } = useOrigens();

  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [titulo, setTitulo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [origemId, setOrigemId] = useState<string>('');
  const [valor, setValor] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const src = edit || initial;
    if (src) {
      setData(src.data);
      setTitulo(src.descricao);
      setObservacoes((src as any).observacoes || '');
      setOrigemId(src.origem_id || '');
      setValor(String(src.valor_realizado));
    } else {
      setData(format(month, 'yyyy-MM-dd'));
      setTitulo('');
      setObservacoes('');
      setOrigemId('');
      setValor('0');
    }
  }, [open, edit, initial, month]);

  const origensEntrada = (origens || []).filter(o => o.tipo === 'entrada' && !o.is_system);

  const save = async () => {
    if (!titulo.trim()) { toast.error('Título obrigatório'); return; }
    if (!data) { toast.error('Data obrigatória'); return; }
    setSaving(true);
    try {
      const payload = {
        tipo: 'entrada' as const,
        data,
        descricao: titulo.trim(),
        observacoes: observacoes.trim() || null,
        origem_id: origemId || null,
        valor_previsto: parseFloat(valor) || 0,
        valor_realizado: parseFloat(valor) || 0,
        is_auto: false,
        mes_referencia: format(startOfMonth(parseISO(data)), 'yyyy-MM-dd'),
      };
      if (edit) {
        const { error } = await supabase.from('financeiro_lancamentos').update(payload).eq('id', edit.id);
        if (error) throw error;
        toast.success('Entrada atualizada');
      } else {
        const { error } = await supabase.from('financeiro_lancamentos').insert(payload);
        if (error) throw error;
        toast.success('Entrada registrada');
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
      <DialogContent className="max-w-md bg-popover border-border">
        <DialogHeader>
          <DialogTitle>{edit ? 'Editar Entrada' : 'Nova Entrada'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Data da entrada</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} className="bg-card border-border" />
          </div>
          <div>
            <Label>Título</Label>
            <Input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              maxLength={80}
              placeholder="Nome exibido na lista"
              className="bg-card border-border"
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Detalhes adicionais (opcional)"
              className="bg-card border-border"
            />
          </div>
          <div>
            <Label>Origem da entrada</Label>
            <Select value={origemId} onValueChange={setOrigemId}>
              <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {origensEntrada.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
            {saving ? 'Salvando...' : 'Salvar Entrada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
