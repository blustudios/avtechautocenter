import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMonth } from '@/contexts/MonthContext';
import { useCategorias, useOrigens } from '@/hooks/financeiro/useFinanceiroData';
import { formatCurrency } from '@/lib/format';
import { formatDateShort } from '@/lib/financeiro/dates';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Pencil, Trash2, Repeat } from 'lucide-react';
import { EditRecorrenciaDialog } from '@/components/financeiro/EditRecorrenciaDialog';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { toast } from 'sonner';

interface RecorrenciaRow {
  id: string;
  frequencia: string;
  data_inicio: string;
  data_fim: string | null;
}
interface LancamentoRow {
  id: string;
  tipo: string;
  data: string;
  descricao: string;
  observacoes: string | null;
  categoria_id: string | null;
  origem_id: string | null;
  valor_previsto: number;
  recorrencia_id: string;
}

export interface RecorrenciaItem {
  rec: RecorrenciaRow;
  instance: LancamentoRow; // ocorrência representativa (próxima do mês atual ou próxima futura)
  countMonth: number;
}

function frequenciaLabel(f: string) {
  if (f === 'mensal') return 'Mensal';
  if (f === 'anual') return 'Anual';
  if (f === 'semanal') return 'Semanal';
  if (f === 'diaria') return 'Diária';
  return f;
}

export default function Recorrencias() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { month } = useMonth();
  const { data: categorias } = useCategorias();
  const { data: origens } = useOrigens();

  const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');

  const [editing, setEditing] = useState<RecorrenciaItem | null>(null);
  const [deleting, setDeleting] = useState<RecorrenciaItem | null>(null);
  const [busyDel, setBusyDel] = useState(false);

  const catFaturadosIds = useMemo(
    () => new Set((categorias || []).filter(c => /faturad/i.test(c.nome)).map(c => c.id)),
    [categorias],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['fin', 'recorrencias-manage', monthStart],
    queryFn: async () => {
      const { data: recs, error: recErr } = await supabase
        .from('financeiro_recorrencias')
        .select('*');
      if (recErr) throw recErr;

      const ids = (recs || []).map(r => r.id);
      if (ids.length === 0) return { mesAtual: [] as RecorrenciaItem[], outras: [] as RecorrenciaItem[] };

      const { data: lancs, error: lancErr } = await supabase
        .from('financeiro_lancamentos')
        .select('id,tipo,data,descricao,observacoes,categoria_id,origem_id,valor_previsto,recorrencia_id')
        .in('recorrencia_id', ids)
        .eq('tipo', 'saida')
        .gte('data', today)
        .order('data', { ascending: true });
      if (lancErr) throw lancErr;

      const byRec = new Map<string, LancamentoRow[]>();
      for (const l of (lancs || []) as LancamentoRow[]) {
        if (l.categoria_id && catFaturadosIds.has(l.categoria_id)) continue;
        if (!byRec.has(l.recorrencia_id)) byRec.set(l.recorrencia_id, []);
        byRec.get(l.recorrencia_id)!.push(l);
      }

      const mesAtual: RecorrenciaItem[] = [];
      const outras: RecorrenciaItem[] = [];

      for (const rec of recs as RecorrenciaRow[]) {
        const list = byRec.get(rec.id);
        if (!list || list.length === 0) continue;
        const inMonth = list.filter(l => l.data >= monthStart && l.data <= monthEnd);
        const repr = inMonth[0] || list[0];
        const item: RecorrenciaItem = { rec, instance: repr, countMonth: inMonth.length };
        if (inMonth.length > 0) mesAtual.push(item);
        else outras.push(item);
      }

      mesAtual.sort((a, b) => a.instance.data.localeCompare(b.instance.data));
      outras.sort((a, b) => a.instance.data.localeCompare(b.instance.data));
      return { mesAtual, outras };
    },
  });

  const catNome = (id: string | null) => categorias?.find(c => c.id === id)?.nome || '—';
  const origemNome = (id: string | null) => origens?.find(o => o.id === id)?.nome || '—';

  const doDelete = async (scope: 'one' | 'forward') => {
    if (!deleting) return;
    setBusyDel(true);
    try {
      if (scope === 'one') {
        const { error } = await supabase.from('financeiro_lancamentos').delete().eq('id', deleting.instance.id);
        if (error) throw error;
        toast.success('Ocorrência excluída');
      } else {
        const { error } = await supabase
          .from('financeiro_lancamentos')
          .delete()
          .eq('recorrencia_id', deleting.rec.id)
          .gte('data', deleting.instance.data);
        if (error) throw error;

        // Se não sobraram lançamentos, remove a recorrência
        const { count } = await supabase
          .from('financeiro_lancamentos')
          .select('id', { count: 'exact', head: true })
          .eq('recorrencia_id', deleting.rec.id);
        if (!count) {
          await supabase.from('financeiro_recorrencias').delete().eq('id', deleting.rec.id);
        }
        toast.success('Recorrência excluída');
      }
      qc.invalidateQueries({ queryKey: ['fin'] });
      setDeleting(null);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir');
    } finally {
      setBusyDel(false);
    }
  };

  const renderItem = (item: RecorrenciaItem) => (
    <div key={item.rec.id + item.instance.id} className="flex items-center gap-3 px-4 py-3 border-t border-border/50 hover:bg-card/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground truncate">{item.instance.descricao}</span>
          <Badge variant="outline" className="text-xs">
            <Repeat className="w-3 h-3 mr-1" />{frequenciaLabel(item.rec.frequencia)}
          </Badge>
          {item.rec.data_fim && (
            <span className="text-xs text-muted-foreground">encerra {formatDateShort(item.rec.data_fim)}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
          <span>próxima: {formatDateShort(item.instance.data)}</span>
          <span>categoria: {catNome(item.instance.categoria_id)}</span>
          <span>origem: {origemNome(item.instance.origem_id)}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold text-foreground">{formatCurrency(Number(item.instance.valor_previsto || 0))}</div>
        <div className="text-xs text-muted-foreground">valor previsto</div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(item)} title="Editar">
        <Pencil className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(item)} title="Excluir">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Gerenciar recorrências</h1>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" />
        </div>
      ) : (
        <>
          <section className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/30 font-semibold text-foreground flex items-center justify-between">
              <span>Mês Atual</span>
              <span className="text-xs text-muted-foreground">{data?.mesAtual.length || 0} recorrência(s)</span>
            </div>
            {data?.mesAtual.length ? data.mesAtual.map(renderItem) : (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                Nenhuma recorrência com ocorrência neste mês.
              </div>
            )}
          </section>

          <section className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/30 font-semibold text-foreground flex items-center justify-between">
              <span>Outras recorrências</span>
              <span className="text-xs text-muted-foreground">{data?.outras.length || 0} recorrência(s)</span>
            </div>
            {data?.outras.length ? data.outras.map(renderItem) : (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                Nenhuma recorrência futura fora deste mês.
              </div>
            )}
          </section>
        </>
      )}

      <EditRecorrenciaDialog
        open={!!editing}
        onOpenChange={v => { if (!v) setEditing(null); }}
        item={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={v => { if (!v) setDeleting(null); }}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recorrência</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha o escopo da exclusão. Ocorrências passadas nunca são afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={busyDel}>Cancelar</AlertDialogCancel>
            <Button variant="outline" disabled={busyDel} onClick={() => doDelete('one')}>
              Somente esta ocorrência
            </Button>
            <AlertDialogAction disabled={busyDel} onClick={() => doDelete('forward')} className="bg-destructive hover:bg-destructive/90">
              Esta e todas as futuras
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
