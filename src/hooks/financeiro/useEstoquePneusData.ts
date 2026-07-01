import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { monthRange, toMesRef } from '@/lib/financeiro/dates';
import { endOfMonth, format, getDate, isSameMonth, startOfMonth } from 'date-fns';

const STALE = 30 * 1000;

export function useEstoqueTotais() {
  return useQuery({
    queryKey: ['fin', 'estoque-pneus', 'totais'],
    staleTime: STALE,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estoque_pneus')
        .select('quantidade, valor_medio_compra');
      if (error) throw error;
      let valorTotal = 0;
      let qtdTotal = 0;
      (data || []).forEach((r: any) => {
        qtdTotal += Number(r.quantidade || 0);
        valorTotal += Number(r.quantidade || 0) * Number(r.valor_medio_compra || 0);
      });
      return { valorTotal, qtdTotal };
    },
  });
}

export interface VendaDia {
  dia: number;
  data: string;
  quantidade: number;
}

export function useVendasPneusMes(month: Date) {
  const mesRef = toMesRef(month);
  const { from, to } = monthRange(month);
  return useQuery({
    queryKey: ['fin', 'estoque-pneus', 'vendas', mesRef],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicos_pneus')
        .select('quantidade, estoque_pneus!inner(tipo), servicos!inner(status, data_entrada, data_encerramento)')
        .eq('baixa_estoque', true)
        .in('servicos.status', ['em_progresso', 'finalizado']);
      if (error) throw error;

      const porDiaMap = new Map<string, number>();
      const porTipo: Record<string, number> = {};
      let totalMes = 0;

      (data || []).forEach((r: any) => {
        const s = r.servicos;
        const dataRef: string | null = s?.data_encerramento || s?.data_entrada || null;
        if (!dataRef) return;
        if (dataRef < from || dataRef > to) return;
        const qtd = Number(r.quantidade || 0);
        totalMes += qtd;
        porDiaMap.set(dataRef, (porDiaMap.get(dataRef) || 0) + qtd);
        const tipo = r.estoque_pneus?.tipo;
        if (tipo) porTipo[tipo] = (porTipo[tipo] || 0) + qtd;
      });

      // Build continuous daily series
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const today = new Date();
      const lastDay = isSameMonth(month, today) ? getDate(today) : getDate(end);

      const porDia: VendaDia[] = [];
      for (let d = 1; d <= lastDay; d++) {
        const dateObj = new Date(start.getFullYear(), start.getMonth(), d);
        const iso = format(dateObj, 'yyyy-MM-dd');
        porDia.push({ dia: d, data: iso, quantidade: porDiaMap.get(iso) || 0 });
      }

      return { totalMes, porDia, porTipo };
    },
  });
}
