import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMonth } from '@/contexts/MonthContext';
import {
  useCategorias, useOrigens, useLancamentosManuais, useAutoLines,
} from '@/hooks/financeiro/useFinanceiroData';
import { monthRange, toMesRef } from '@/lib/financeiro/dates';
import { formatCurrency } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, Legend, CartesianGrid,
  AreaChart, Area, ReferenceLine,
} from 'recharts';
import { endOfMonth, getDate, parseISO, isSameMonth } from 'date-fns';

const COLORS = ['#F97316', '#22C55E', '#3B82F6', '#EAB308', '#A855F7', '#EF4444', '#06B6D4', '#EC4899', '#84CC16', '#F59E0B', '#8B5CF6', '#10B981'];

export function TabResumo() {
  const { month } = useMonth();
  const { data: categorias } = useCategorias();
  const { data: origens } = useOrigens();
  const { data: manuais, isLoading } = useLancamentosManuais(month);
  const { data: auto } = useAutoLines(month, categorias, origens);

  const all = useMemo(() => [...(manuais || []), ...(auto ? [auto.entrada, auto.saida] : [])], [manuais, auto]);
  const catRetiradas = categorias?.find(c => c.is_system && c.nome === 'Retiradas');

  const entradas = all.filter(l => l.tipo === 'entrada');
  const saidas = all.filter(l => l.tipo === 'saida');

  const totalEntradas = entradas.reduce((s, l) => s + Number(l.valor_realizado || 0), 0);
  const totalSaidas = saidas.reduce((s, l) => s + Number(l.valor_realizado || 0), 0);
  const totalRetiradas = saidas.filter(l => l.categoria_id === catRetiradas?.id).reduce((s, l) => s + Number(l.valor_realizado || 0), 0);
  const lucroLiquido = totalEntradas - (totalSaidas - totalRetiradas);
  const saidasACompensar = saidas
    .filter(l => l.status_pagamento !== 'pago')
    .reduce((s, l) => s + (Number(l.valor_realizado) || Number(l.valor_previsto) || 0), 0);

  const porCategoria = useMemo(() => {
    const m = new Map<string, { nome: string; previsto: number; realizado: number }>();
    for (const l of saidas) {
      const cat = categorias?.find(c => c.id === l.categoria_id);
      const key = cat?.id || 'sem-cat';
      const nome = cat?.nome || 'Sem categoria';
      if (!m.has(key)) m.set(key, { nome, previsto: 0, realizado: 0 });
      const g = m.get(key)!;
      g.previsto += Number(l.valor_previsto || 0);
      g.realizado += Number(l.valor_realizado || 0);
    }
    return Array.from(m.values()).sort((a, b) => b.realizado - a.realizado);
  }, [saidas, categorias]);

  const mesRef = toMesRef(month);

  const { data: pagDaily } = useQuery({
    queryKey: ['fin', 'resumo-pag-daily', mesRef],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { from, to } = monthRange(month);
      const { data } = await supabase
        .from('servicos_pagamentos')
        .select('valor, taxa_aplicada, data_pagamento, pago, servicos!inner(status)')
        .eq('pago', true)
        .gte('data_pagamento', from).lte('data_pagamento', to)
        .in('servicos.status', ['em_progresso', 'finalizado']);
      return data || [];
    },
  });

  const { data: custosDaily } = useQuery({
    queryKey: ['fin', 'resumo-custos-daily', mesRef],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { from, to } = monthRange(month);
      const { data } = await supabase
        .from('servicos_custos')
        .select('valor, data_compra, servicos!inner(status)')
        .gte('data_compra', from).lte('data_compra', to)
        .in('servicos.status', ['em_progresso', 'finalizado']);
      return data || [];
    },
  });

  const serieDiaria = useMemo(() => {
    const lastDayMonth = getDate(endOfMonth(month));
    const today = new Date();
    const isCurrent = isSameMonth(today, month);
    const lastDay = isCurrent ? Math.min(getDate(today), lastDayMonth) : lastDayMonth;
    if (lastDay < 1) return [];

    const entradasPorDia = new Array(lastDayMonth + 1).fill(0) as number[];
    const efetivadasPorDia = new Array(lastDayMonth + 1).fill(0) as number[];
    const inMonth = (d: Date) => d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
    const dayOf = (s: string) => {
      try { const d = parseISO(s); return inMonth(d) ? getDate(d) : null; } catch { return null; }
    };

    // Entradas manuais (valor_realizado por data)
    for (const l of entradas) {
      const dia = dayOf(l.data);
      if (dia) entradasPorDia[dia] += Number(l.valor_realizado || 0);
    }
    // Entradas automáticas: pagamentos líquidos (valor - taxa) por data_pagamento
    for (const p of (pagDaily as any[]) || []) {
      const dia = dayOf(p.data_pagamento);
      if (!dia) continue;
      const liquido = Number(p.valor) - (Number(p.valor) * Number(p.taxa_aplicada || 0)) / 100;
      entradasPorDia[dia] += liquido;
    }

    // Saídas previstas do mês (constante) — exclui Retiradas
    let previstoMes = 0;
    for (const l of saidas) {
      if (l.categoria_id === catRetiradas?.id) continue;
      previstoMes += Number(l.valor_previsto || 0);
    }

    // Saídas efetivadas por dia — manuais pagas (exclui Retiradas) + custos por data_compra
    for (const l of saidas) {
      if (l.categoria_id === catRetiradas?.id) continue;
      if (l.status_pagamento !== 'pago') continue;
      if ((l as any).__virtual) continue; // auto custos tratados via custosDaily
      const dia = dayOf(l.data);
      if (dia) efetivadasPorDia[dia] += Number(l.valor_realizado || 0);
    }
    for (const c of (custosDaily as any[]) || []) {
      const dia = dayOf(c.data_compra);
      if (dia) efetivadasPorDia[dia] += Number(c.valor || 0);
    }

    let accEntradas = 0;
    const arr: { dia: number; acumulado: number; positivo: number; negativo: number }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      accEntradas += entradasPorDia[d];
      const valor = accEntradas - previstoMes - efetivadasPorDia[d];
      arr.push({
        dia: d,
        acumulado: valor,
        positivo: valor > 0 ? valor : 0,
        negativo: valor < 0 ? valor : 0,
      });
    }
    return arr;
  }, [entradas, saidas, catRetiradas, month, pagDaily, custosDaily]);

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;

  const KPI = ({ label, value, color }: { label: string; value: number; color?: string }) => (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color || 'text-foreground'}`}>{formatCurrency(value)}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Lucro Líquido Real" value={lucroLiquido} color={lucroLiquido >= 0 ? 'text-green-400' : 'text-red-400'} />
        <KPI label="Saídas a Compensar" value={saidasACompensar} color="text-yellow-400" />
        <KPI label="Total Entradas" value={totalEntradas} color="text-green-400" />
        <KPI label="Total Saídas" value={totalSaidas} color="text-foreground" />
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3 text-foreground">Lucro Líquido Real — evolução no mês</h3>
        {serieDiaria.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados no mês</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={serieDiaria} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
              <XAxis dataKey="dia" stroke="#888" tick={{ fontSize: 11 }} />
              <YAxis stroke="#888" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(Number(v))} width={90} />
              <ReferenceLine y={0} stroke="#555" />
              <RTooltip
                formatter={(v: any) => formatCurrency(Number(v))}
                labelFormatter={(l) => `Dia ${l}`}
                contentStyle={{ background: '#1A1A1A', border: '1px solid #333' }}
              />
              <Area type="monotone" dataKey="positivo" stroke="#22C55E" fill="#22C55E" fillOpacity={0.35} isAnimationActive={false} />
              <Area type="monotone" dataKey="negativo" stroke="#EF4444" fill="#EF4444" fillOpacity={0.35} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>



      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3 text-foreground">Previsto vs Realizado por Categoria</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2">Categoria</th>
                <th className="text-right py-2">Previsto</th>
                <th className="text-right py-2">Realizado</th>
                <th className="text-right py-2">Desvio (R$)</th>
                <th className="text-right py-2">Desvio (%)</th>
              </tr>
            </thead>
            <tbody>
              {porCategoria.map(r => {
                const desvio = r.realizado - r.previsto;
                const pct = r.previsto > 0 ? (desvio / r.previsto) * 100 : 0;
                const ok = r.realizado <= r.previsto;
                return (
                  <tr key={r.nome} className="border-b border-border/40">
                    <td className="py-2 text-foreground">{r.nome}</td>
                    <td className="py-2 text-right text-muted-foreground">{formatCurrency(r.previsto)}</td>
                    <td className="py-2 text-right text-foreground">{formatCurrency(r.realizado)}</td>
                    <td className={`py-2 text-right font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(desvio)}</td>
                    <td className={`py-2 text-right ${ok ? 'text-green-400' : 'text-red-400'}`}>{r.previsto > 0 ? `${pct.toFixed(1)}%` : '—'}</td>
                  </tr>
                );
              })}
              {porCategoria.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-4">Sem saídas no mês.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-foreground">Saídas por Categoria</h3>
          {porCategoria.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={porCategoria} dataKey="realizado" nameKey="nome" innerRadius={50} outerRadius={90}>
                  {porCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RTooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ background: '#1A1A1A', border: '1px solid #333' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-foreground">Previsto vs Realizado</h3>
          {porCategoria.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porCategoria}>
                <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
                <XAxis dataKey="nome" stroke="#888" tick={{ fontSize: 10 }} />
                <YAxis stroke="#888" tick={{ fontSize: 10 }} />
                <RTooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ background: '#1A1A1A', border: '1px solid #333' }} />
                <Legend />
                <Bar dataKey="previsto" fill="#3B82F6" name="Previsto" />
                <Bar dataKey="realizado" fill="#F97316" name="Realizado" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Retiradas de Lucro</div>
            <div className="text-xs text-muted-foreground">(não contabilizadas no lucro operacional)</div>
          </div>
          <div className="text-2xl font-bold text-primary">{formatCurrency(totalRetiradas)}</div>
        </div>
      </div>
    </div>
  );
}
