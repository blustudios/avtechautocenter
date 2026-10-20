import { format, startOfMonth, subMonths, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export const CAIXA_MOVIMENTOS_INICIO = '2026-10-01';

export interface Movimento {
  id: string;
  mes_referencia: string;
  data: string;
  tipo: 'deposito' | 'saque';
  valor: number;
  descricao: string;
  servico_pagamento_id: string | null;
  servico_id: string | null;
  created_at: string;
}

export function usaMovimentos(mesRef: string): boolean {
  return mesRef >= CAIXA_MOVIMENTOS_INICIO;
}

export function calcSaldoDinheiro(anterior: number, movs: Pick<Movimento, 'tipo' | 'valor'>[]): number {
  const total = movs.reduce((s, m) => s + (m.tipo === 'deposito' ? 1 : -1) * Number(m.valor || 0), anterior);
  return Math.round(total * 100) / 100;
}

const db = supabase as any;

export async function recalcSaldoDinheiro(mesRef: string) {
  const prevRef = format(startOfMonth(subMonths(parseISO(mesRef), 1)), 'yyyy-MM-dd');
  const { data: caixas } = await supabase.from('financeiro_caixa').select('*').in('mes_referencia', [mesRef, prevRef]);
  const prev = (caixas || []).find((c: any) => c.mes_referencia === prevRef);
  const cur = (caixas || []).find((c: any) => c.mes_referencia === mesRef);
  const { data: movs, error } = await db.from('financeiro_caixa_movimentos').select('tipo, valor').eq('mes_referencia', mesRef);
  if (error) throw error;
  const saldo = calcSaldoDinheiro(Number(prev?.saldo_dinheiro || 0), movs || []);
  const { error: e2 } = await supabase.from('financeiro_caixa').upsert({
    mes_referencia: mesRef,
    saldo_conta_pj: Number(cur?.saldo_conta_pj || 0),
    saldo_stone: Number(cur?.saldo_stone || 0),
    saldo_dinheiro: saldo,
  }, { onConflict: 'mes_referencia' });
  if (e2) throw e2;
  return saldo;
}

export async function addMovimento(m: Omit<Movimento, 'id' | 'created_at'>) {
  const { error } = await db.from('financeiro_caixa_movimentos').insert(m);
  if (error) throw error;
  await recalcSaldoDinheiro(m.mes_referencia);
}

export async function deleteMovimento(m: Movimento) {
  const { error } = await db.from('financeiro_caixa_movimentos').delete().eq('id', m.id);
  if (error) throw error;
  await recalcSaldoDinheiro(m.mes_referencia);
}
