import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { monthRange, toMesRef } from '@/lib/financeiro/dates';
import { startOfMonth, subMonths, format } from 'date-fns';

const STALE = 30 * 1000;

export interface Categoria {
  id: string;
  nome: string;
  is_default: boolean;
  is_system: boolean;
}
export interface Origem {
  id: string;
  nome: string;
  tipo: 'entrada' | 'saida';
  is_default: boolean;
  is_system: boolean;
}
export interface Lancamento {
  id: string;
  tipo: 'entrada' | 'saida';
  data: string;
  descricao: string;
  categoria_id: string | null;
  origem_id: string | null;
  valor_previsto: number;
  valor_realizado: number;
  status_pagamento: string | null;
  recorrencia_id: string | null;
  is_auto: boolean;
  mes_referencia: string;
  __virtual?: boolean;
}

export function useCategorias() {
  return useQuery({
    queryKey: ['fin', 'categorias'],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_categorias')
        .select('*')
        .order('nome');
      if (error) throw error;
      return (data || []) as Categoria[];
    },
  });
}

export function useOrigens() {
  return useQuery({
    queryKey: ['fin', 'origens'],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_origens')
        .select('*')
        .order('nome');
      if (error) throw error;
      return (data || []) as Origem[];
    },
  });
}

export function useLancamentosManuais(month: Date) {
  const mesRef = toMesRef(month);
  return useQuery({
    queryKey: ['fin', 'lancamentos', mesRef],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_lancamentos')
        .select('*')
        .eq('mes_referencia', mesRef)
        .order('data', { ascending: true });
      if (error) throw error;
      return (data || []) as Lancamento[];
    },
  });
}

/** Computes the auto Entrada de Serviços + Custos de Serviço lines from servicos data */
export function useAutoLines(month: Date, categorias: Categoria[] | undefined, origens: Origem[] | undefined) {
  const { from, to } = monthRange(month);
  const mesRef = toMesRef(month);
  return useQuery({
    queryKey: ['fin', 'auto', mesRef],
    staleTime: STALE,
    enabled: !!categorias && !!origens,
    queryFn: async () => {
      // Pagamentos (entrada)
      const { data: pagamentos } = await supabase
        .from('servicos_pagamentos')
        .select('valor, taxa_aplicada, data_pagamento, pago, servicos!inner(status)')
        .eq('pago', true)
        .gte('data_pagamento', from)
        .lte('data_pagamento', to)
        .in('servicos.status', ['em_progresso', 'finalizado']);

      const totalEntrada = (pagamentos || []).reduce((sum: number, p: any) => {
        const liquido = Number(p.valor) - (Number(p.valor) * Number(p.taxa_aplicada || 0)) / 100;
        return sum + liquido;
      }, 0);

      // Custos (saida)
      const { data: custos } = await supabase
        .from('servicos_custos')
        .select('valor, data_compra, servicos!inner(status)')
        .gte('data_compra', from)
        .lte('data_compra', to)
        .in('servicos.status', ['em_progresso', 'finalizado']);

      const today = format(new Date(), 'yyyy-MM-dd');
      const totalCustos = (custos || []).reduce((sum: number, c: any) => sum + Number(c.valor || 0), 0);
      const custosFuturos = (custos || []).reduce(
        (sum: number, c: any) => (c.data_compra > today ? sum + Number(c.valor || 0) : sum),
        0
      );

      const catCustos = categorias?.find(c => c.is_system && c.nome === 'Custos de Serviço');
      const origServicos = origens?.find(o => o.is_system && o.nome === 'Entrada de Serviços');

      const entrada: Lancamento = {
        id: `auto-entrada-${mesRef}`,
        tipo: 'entrada',
        data: from,
        descricao: 'Entrada de Serviços (automático)',
        categoria_id: null,
        origem_id: origServicos?.id || null,
        valor_previsto: totalEntrada,
        valor_realizado: totalEntrada,
        status_pagamento: 'pago',
        recorrencia_id: null,
        is_auto: true,
        mes_referencia: mesRef,
        __virtual: true,
      };
      const saida: Lancamento = {
        id: `auto-saida-${mesRef}`,
        tipo: 'saida',
        data: from,
        descricao: 'Custos de Serviço (automático)',
        categoria_id: catCustos?.id || null,
        origem_id: null,
        valor_previsto: totalCustos,
        valor_realizado: totalCustos,
        status_pagamento: 'pago',
        recorrencia_id: null,
        is_auto: true,
        mes_referencia: mesRef,
        __virtual: true,
      };
      return { entrada, saida };
    },
  });
}

export function useCaixa(month: Date) {
  const mesRef = toMesRef(month);
  const prevMesRef = format(startOfMonth(subMonths(month, 1)), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['fin', 'caixa', mesRef],
    staleTime: STALE,
    queryFn: async () => {
      const { data } = await supabase
        .from('financeiro_caixa')
        .select('*')
        .in('mes_referencia', [mesRef, prevMesRef]);
      const current = (data || []).find((r: any) => r.mes_referencia === mesRef) || null;
      const previous = (data || []).find((r: any) => r.mes_referencia === prevMesRef) || null;
      return { current, previous, mesRef, prevMesRef };
    },
  });
}
