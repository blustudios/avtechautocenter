import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wrench, Car, Calculator, CreditCard, Save, CalendarIcon, HelpCircle, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subDays, differenceInCalendarDays, eachDayOfInterval, getDate, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FilterType = 'hoje' | 'ontem' | 'semana' | 'mes' | 'mes_passado' | 'custom';

interface SavedFilter {
  type: FilterType;
  customStart?: string;
  customEnd?: string;
}

interface Pagamento {
  tipo: string;
  valor: number;
  taxa_aplicada: number;
  pago: boolean;
  data_pagamento: string | null;
  servico_id: string;
}

interface Servico {
  id: string;
  data_entrada: string;
  valor_total: number;
  custo_total: number;
  status: string;
  status_pagamento: string;
}

interface CustoItem {
  valor: number;
  quantidade: number;
  data_compra: string | null;
}

function getDateRange(type: FilterType, customStart?: Date, customEnd?: Date): [Date, Date] {
  const today = new Date();
  switch (type) {
    case 'hoje': return [today, today];
    case 'ontem': { const y = subDays(today, 1); return [y, y]; }
    case 'semana': return [startOfWeek(today, { weekStartsOn: 1 }), endOfWeek(today, { weekStartsOn: 1 })];
    case 'mes': return [startOfMonth(today), endOfMonth(today)];
    case 'mes_passado': { const m = subMonths(today, 1); return [startOfMonth(m), endOfMonth(m)]; }
    case 'custom': return [customStart || today, customEnd || today];
  }
}

function getPrevRange(type: FilterType, start: Date, end: Date): [Date, Date] {
  const today = new Date();
  switch (type) {
    case 'hoje': { const y = subDays(today, 1); return [y, y]; }
    case 'ontem': { const a = subDays(today, 2); return [a, a]; }
    case 'semana': return [subDays(start, 7), subDays(end, 7)];
    case 'mes': {
      const prevMonth = subMonths(today, 1);
      return [startOfMonth(prevMonth), prevMonth];
    }
    case 'mes_passado': {
      const m = subMonths(today, 2);
      return [startOfMonth(m), endOfMonth(m)];
    }
    case 'custom': {
      const days = differenceInCalendarDays(end, start) + 1;
      return [subDays(start, days), subDays(start, 1)];
    }
  }
}

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function countWorkingDays(start: Date, end: Date): number {
  if (end < start) return 0;
  const days = eachDayOfInterval({ start, end });
  return days.filter(d => { const dow = d.getDay(); return dow >= 1 && dow <= 6; }).length;
}

const toMonthKey = (d: Date) => format(d, 'yyyy-MM');
const parseMonthKey = (k: string) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1); };
const formatMonthLabel = (d: Date) => {
  const s = format(d, 'MMMM/yyyy', { locale: ptBR });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const SLOT_COLORS = ['hsl(217 91% 60%)', 'hsl(280 70% 60%)', 'hsl(160 70% 45%)'];
const CURRENT_COLOR = 'hsl(var(--primary))';
const GOAL_VALUES: { key: 'g55' | 'g65' | 'g75'; label: string; value: number }[] = [
  { key: 'g55', label: 'R$ 55k', value: 55000 },
  { key: 'g65', label: 'R$ 65k', value: 65000 },
  { key: 'g75', label: 'R$ 75k', value: 75000 },
];

export default function Dashboard() {
  const saved = localStorage.getItem('dashboard_filter');
  const initial: SavedFilter = saved ? JSON.parse(saved) : { type: 'mes' };

  const [filterType, setFilterType] = useState<FilterType>(initial.type);
  const [customStart, setCustomStart] = useState<Date | undefined>(initial.customStart ? new Date(initial.customStart) : undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(initial.customEnd ? new Date(initial.customEnd) : undefined);
  const [dirty, setDirty] = useState(false);
  const [compareMonths, setCompareMonths] = useState<(string | null)[]>(() => [toMonthKey(subMonths(new Date(), 1)), null, null]);
  const [goals, setGoals] = useState<{ g55: boolean; g65: boolean; g75: boolean }>({ g55: false, g65: false, g75: false });

  const [startDate, endDate] = useMemo(() => getDateRange(filterType, customStart, customEnd), [filterType, customStart, customEnd]);
  const [prevStart, prevEnd] = useMemo(() => getPrevRange(filterType, startDate, endDate), [filterType, startDate, endDate]);

  const s = toDateStr(startDate);
  const e = toDateStr(endDate);
  const ps = toDateStr(prevStart);
  const pe = toDateStr(prevEnd);

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ['dashboard', s, e, ps, pe],
    queryFn: async () => {
      const [pRes, sRes, ppRes, cRes, arRes] = await Promise.all([
        supabase.from('servicos_pagamentos')
          .select('tipo, valor, taxa_aplicada, pago, data_pagamento, servico_id, servicos!inner(status)')
          .eq('pago', true)
          .gte('data_pagamento', s).lte('data_pagamento', e)
          .not('servicos.status', 'in', '("orcamento","cancelado")'),
        supabase.from('servicos')
          .select('id, data_entrada, valor_total, custo_total, status, status_pagamento')
          .gte('data_entrada', s).lte('data_entrada', e)
          .not('status', 'in', '("orcamento","cancelado")'),
        supabase.from('servicos_pagamentos')
          .select('tipo, valor, taxa_aplicada, pago, data_pagamento, servico_id, servicos!inner(status)')
          .eq('pago', true)
          .gte('data_pagamento', ps).lte('data_pagamento', pe)
          .not('servicos.status', 'in', '("orcamento","cancelado")'),
        supabase.from('servicos_custos')
          .select('valor, quantidade, data_compra, servicos!inner(status)')
          .not('data_compra', 'is', null)
          .gte('data_compra', s).lte('data_compra', e)
          .not('servicos.status', 'in', '("orcamento","cancelado")'),
        supabase.from('servicos_pagamentos')
          .select('tipo, valor, pago, data_pagamento, servicos!inner(status)')
          .eq('pago', false)
          .gte('data_pagamento', s).lte('data_pagamento', e)
          .not('servicos.status', 'in', '("orcamento","cancelado")'),
      ]);
      return {
        pagamentos: (pRes.data || []) as any as Pagamento[],
        servicos: (sRes.data || []) as Servico[],
        prevPagamentos: (ppRes.data || []) as any as Pagamento[],
        custosData: (cRes.data || []) as any as CustoItem[],
        contasReceberData: (arRes.data || []) as any as Pagamento[],
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  // Previsão de Recebimentos: serviços em progresso sem nenhum pagamento
  const { data: previsao } = useQuery({
    queryKey: ['dashboard-previsao'],
    queryFn: async () => {
      const { data } = await supabase
        .from('servicos')
        .select('id, valor_total, servicos_pagamentos(id)')
        .eq('status', 'em_progresso');
      const lista = (data || []) as any[];
      return lista
        .filter(s => !s.servicos_pagamentos || s.servicos_pagamentos.length === 0)
        .reduce((sum, s) => sum + Number(s.valor_total || 0), 0);
    },
    staleTime: 2 * 60 * 1000,
  });

  // Gráfico acumulado mensal (independente dos filtros)
  const today = new Date();
  const curMonthKey = toMonthKey(startOfMonth(today));

  // Slots ativos (mês atual + comparações selecionadas, sem duplicar)
  const activeMonthKeys = useMemo(() => {
    const arr: string[] = [curMonthKey];
    compareMonths.forEach(k => { if (k && !arr.includes(k)) arr.push(k); });
    return arr;
  }, [compareMonths, curMonthKey]);

  // Opções de meses (12 meses anteriores ao atual)
  const monthOptions = useMemo(() => {
    const opts: { key: string; label: string }[] = [];
    for (let i = 1; i <= 12; i++) {
      const d = subMonths(startOfMonth(today), i);
      opts.push({ key: toMonthKey(d), label: formatMonthLabel(d) });
    }
    return opts;
  }, [today]);

  const { data: cumulativeData } = useQuery({
    queryKey: ['dashboard-cumulative', activeMonthKeys.join(',')],
    queryFn: async () => {
      const results = await Promise.all(activeMonthKeys.map(async (k) => {
        const start = parseMonthKey(k);
        const end = endOfMonth(start);
        const { data } = await supabase.from('servicos_pagamentos')
          .select('valor, data_pagamento, tipo, servicos!inner(status)')
          .eq('pago', true)
          .gte('data_pagamento', toDateStr(start)).lte('data_pagamento', toDateStr(end))
          .not('servicos.status', 'in', '("orcamento","cancelado")');
        return [k, (data || []) as any[]] as const;
      }));
      return Object.fromEntries(results) as Record<string, any[]>;
    },
    staleTime: 2 * 60 * 1000,
  });

  const cumulativeSeries = useMemo(() => {
    const todayDay = getDate(today);
    const dayCounts: Record<string, number> = {};
    const sumMaps: Record<string, Record<number, number>> = {};
    activeMonthKeys.forEach(k => {
      dayCounts[k] = getDaysInMonth(parseMonthKey(k));
      const m: Record<number, number> = {};
      (cumulativeData?.[k] || []).filter(r => r.tipo !== 'A Definir').forEach(r => {
        if (!r.data_pagamento) return;
        const d = Number(r.data_pagamento.split('-')[2]);
        m[d] = (m[d] || 0) + Number(r.valor);
      });
      sumMaps[k] = m;
    });
    const maxDays = Math.max(...activeMonthKeys.map(k => dayCounts[k]));
    const acc: Record<string, number> = {};
    activeMonthKeys.forEach(k => { acc[k] = 0; });
    const serie: any[] = [];
    for (let i = 1; i <= maxDays; i++) {
      const point: any = { dia: i };
      activeMonthKeys.forEach(k => {
        const days = dayCounts[k];
        if (i > days) { point[k] = null; return; }
        if (k === curMonthKey && i > todayDay) { point[k] = null; return; }
        acc[k] += sumMaps[k][i] || 0;
        point[k] = acc[k];
      });
      serie.push(point);
    }
    return serie;
  }, [cumulativeData, activeMonthKeys, today, curMonthKey]);

  // Mapeia chave de mês -> cor (atual fixo, demais por ordem de slot)
  const monthColorMap = useMemo(() => {
    const map: Record<string, string> = { [curMonthKey]: CURRENT_COLOR };
    compareMonths.forEach((k, i) => {
      if (k && !map[k]) map[k] = SLOT_COLORS[i] || SLOT_COLORS[SLOT_COLORS.length - 1];
    });
    return map;
  }, [compareMonths, curMonthKey]);

  const pagamentos = queryData?.pagamentos ?? [];
  const servicos = queryData?.servicos ?? [];
  const prevPagamentos = queryData?.prevPagamentos ?? [];
  const custosData = queryData?.custosData ?? [];
  const contasReceberData = queryData?.contasReceberData ?? [];

  const changeFilter = (type: FilterType) => {
    setFilterType(type);
    setDirty(true);
  };

  const saveFilter = () => {
    const obj: SavedFilter = { type: filterType };
    if (filterType === 'custom' && customStart && customEnd) {
      obj.customStart = toDateStr(customStart);
      obj.customEnd = toDateStr(customEnd);
    }
    localStorage.setItem('dashboard_filter', JSON.stringify(obj));
    setDirty(false);
    toast.success('Filtro salvo como padrão');
  };

  const validPagamentos = useMemo(() => pagamentos.filter(p => p.tipo !== 'A Definir'), [pagamentos]);
  const prevValid = useMemo(() => prevPagamentos.filter(p => p.tipo !== 'A Definir'), [prevPagamentos]);

  const faturamento = validPagamentos.reduce((s, p) => s + Number(p.valor), 0);
  const lucroLiquido = validPagamentos.reduce((s, p) => s + (Number(p.valor) - Number(p.valor) * Number(p.taxa_aplicada) / 100), 0);
  const numServicos = servicos.length;
  const ticketMedio = numServicos > 0 ? servicos.reduce((s, v) => s + Number(v.valor_total), 0) / numServicos : 0;
  const custoTotal = custosData.reduce((s, c) => s + Number(c.valor) * Number(c.quantidade), 0);
  const lucroLiquidoReal = lucroLiquido - custoTotal;

  // Divisor proporcional: nunca conta dias futuros
  const effectiveEnd = endDate > today ? today : endDate;
  const totalDays = Math.max(1, differenceInCalendarDays(effectiveEnd, startDate) + 1);
  const workDays = Math.max(1, countWorkingDays(startDate, effectiveEnd));
  const mediaCarrosDia = numServicos / workDays;
  const mediaFatDia = faturamento / totalDays;

  const contasReceber = contasReceberData.filter(p => p.tipo !== 'A Definir').reduce((s, p) => s + Number(p.valor), 0);

  const prevFat = prevValid.reduce((s, p) => s + Number(p.valor), 0);
  const fatChange = prevFat > 0 ? ((faturamento - prevFat) / prevFat * 100) : 0;

  const barData = useMemo(() => {
    const map: Record<string, number> = {};
    validPagamentos.forEach(p => {
      if (p.data_pagamento) {
        map[p.data_pagamento] = (map[p.data_pagamento] || 0) + Number(p.valor);
      }
    });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.map(d => {
      const key = toDateStr(d);
      return { label: format(d, 'dd/MM'), valor: map[key] || 0 };
    });
  }, [validPagamentos, startDate, endDate]);

  const statusCounts = [
    { name: 'Em Progresso', value: servicos.filter(s => s.status === 'em_progresso').length, color: 'hsl(var(--status-em-progresso))' },
    { name: 'Finalizado', value: servicos.filter(s => s.status === 'finalizado').length, color: 'hsl(var(--status-entregue))' },
  ].filter(s => s.value > 0);

  const paymentCounts = [
    { name: 'Pago', value: servicos.filter(s => s.status_pagamento === 'pago').length, color: 'hsl(var(--status-pago))' },
    { name: 'Pendente', value: servicos.filter(s => s.status_pagamento === 'pendente').length, color: 'hsl(var(--status-pendente))' },
    { name: 'Parcial', value: servicos.filter(s => s.status_pagamento === 'pendente_parcial').length, color: 'hsl(var(--status-parcial))' },
    { name: 'Em Atraso', value: servicos.filter(s => s.status_pagamento === 'em_atraso').length, color: 'hsl(var(--destructive))' },
  ].filter(s => s.value > 0);

  const metrics = [
    { label: 'Faturamento', value: formatCurrency(faturamento), icon: DollarSign, help: 'Soma de todos os pagamentos efetivamente recebidos no período.' },
    { label: '(Faturamento) - (% Taxas)', value: formatCurrency(lucroLiquido), icon: TrendingUp, help: 'Faturamento descontando as taxas cobradas pelas maquininhas.' },
    { label: 'Lucro Líquido', value: formatCurrency(lucroLiquidoReal), icon: TrendingUp, help: 'Faturamento sem taxas, menos os custos dos serviços do período.' },
    { label: 'Custos dos Serviços', value: formatCurrency(custoTotal), icon: TrendingDown, help: 'Total gasto em peças e insumos no período.' },
    { label: 'Serviços', value: String(numServicos), icon: Wrench, help: 'Quantidade de serviços iniciados (data de entrada) no período.' },
    { label: 'Ticket Médio', value: formatCurrency(ticketMedio), icon: Calculator, help: 'Valor médio por serviço (soma dos valores ÷ nº de serviços).' },
    { label: 'Média Carros/Dia', value: mediaCarrosDia.toFixed(1), icon: Car, help: 'Serviços por dia útil (seg–sáb). No mês atual considera apenas até hoje.' },
    { label: 'Média Fat./Dia', value: formatCurrency(mediaFatDia), icon: DollarSign, help: 'Faturamento dividido pelos dias do período. No mês atual considera apenas até hoje.' },
    { label: 'Contas a Receber', value: formatCurrency(contasReceber), icon: CreditCard, help: 'Pagamentos pendentes com vencimento dentro do período.' },
    { label: 'Previsão de Recebimentos', value: formatCurrency(previsao || 0), icon: Hourglass, help: 'Soma do valor de serviços em progresso que ainda não têm nenhum pagamento lançado. Não é afetado pelo filtro de período.' },
  ];

  const filterButtons: { label: string; value: FilterType }[] = [
    { label: 'Hoje', value: 'hoje' },
    { label: 'Ontem', value: 'ontem' },
    { label: 'Esta Semana', value: 'semana' },
    { label: 'Este Mês', value: 'mes' },
    { label: 'Mês Passado', value: 'mes_passado' },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

        <div className="flex flex-wrap items-center gap-2">
          {filterButtons.map(f => (
            <Button key={f.value} variant={filterType === f.value ? 'default' : 'outline'} size="sm" onClick={() => changeFilter(f.value)}>
              {f.label}
            </Button>
          ))}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant={filterType === 'custom' ? 'default' : 'outline'} size="sm">
                <CalendarIcon className="w-4 h-4 mr-1" />
                {filterType === 'custom' && customStart && customEnd
                  ? `${format(customStart, 'dd/MM')} - ${format(customEnd, 'dd/MM')}`
                  : 'Personalizado'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Data Início</p>
                  <Calendar mode="single" selected={customStart}
                    onSelect={(d) => { setCustomStart(d || undefined); if (d && customEnd) { changeFilter('custom'); } }}
                    className={cn("p-2 pointer-events-auto")} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Data Fim</p>
                  <Calendar mode="single" selected={customEnd}
                    onSelect={(d) => { setCustomEnd(d || undefined); if (d && customStart) { changeFilter('custom'); } }}
                    className={cn("p-2 pointer-events-auto")} />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {dirty && (
            <Button size="sm" variant="outline" onClick={saveFilter} className="text-primary border-primary">
              <Save className="w-4 h-4 mr-1" /> Salvar Filtro
            </Button>
          )}

          <span className="text-xs text-muted-foreground ml-auto">
            {format(startDate, 'dd/MM/yyyy')} — {format(endDate, 'dd/MM/yyyy')}
          </span>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {metrics.map(m => (
                <div key={m.label} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <m.icon className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground flex-1 truncate">{m.label}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/60 hover:text-primary transition-colors" aria-label="Ajuda">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-xs">
                        {m.help}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-lg font-bold text-foreground">{m.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
              <div>
                <span className="text-sm text-muted-foreground">vs. Período Anterior</span>
                <div className="flex items-center gap-2 mt-1">
                  {fatChange >= 0 ? <TrendingUp className="w-5 h-5 text-status-entregue" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
                  <span className={`text-xl font-bold ${fatChange >= 0 ? 'text-status-entregue' : 'text-destructive'}`}>
                    {fatChange >= 0 ? '+' : ''}{fatChange.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Anterior ({format(prevStart, 'dd/MM')} - {format(prevEnd, 'dd/MM')}): {formatCurrency(prevFat)}
                </p>
              </div>
            </div>

            {/* Gráfico acumulado mensal */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Faturamento Acumulado do Mês</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground/60 hover:text-primary transition-colors" aria-label="Ajuda">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] text-xs">
                      Soma acumulada do faturamento dia a dia ao longo do mês corrente. Não é afetado pelo filtro acima.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  {GOAL_VALUES.map(g => (
                    <label key={g.key} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <Checkbox checked={goals[g.key]} onCheckedChange={(c) => setGoals(prev => ({ ...prev, [g.key]: !!c }))} />
                      Meta {g.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {[0, 1, 2].map(slot => (
                  <div key={slot} className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Comparar {slot + 1}</span>
                    <Select
                      value={compareMonths[slot] ?? 'none'}
                      onValueChange={(v) => setCompareMonths(prev => { const next = [...prev]; next[slot] = v === 'none' ? null : v; return next; })}
                    >
                      <SelectTrigger className="h-8 w-[150px] text-xs">
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {monthOptions.map(o => (
                          <SelectItem key={o.key} value={o.key} disabled={compareMonths.some((k, i) => i !== slot && k === o.key)}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={cumulativeSeries}>
                  <defs>
                    {activeMonthKeys.map((k, idx) => (
                      <linearGradient key={k} id={`fillMonth-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={monthColorMap[k]} stopOpacity={idx === 0 ? 0.45 : 0.25} />
                        <stop offset="100%" stopColor={monthColorMap[k]} stopOpacity={0.03} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="dia" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                  <RTooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }}
                    formatter={(v: number, name: string) => {
                      const label = name === curMonthKey
                        ? `${formatMonthLabel(parseMonthKey(name))} (Atual)`
                        : formatMonthLabel(parseMonthKey(name));
                      return [formatCurrency(v), label];
                    }}
                    labelFormatter={(d) => `Dia ${d}`}
                  />
                  {activeMonthKeys.slice().reverse().map(k => (
                    <Area
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={monthColorMap[k]}
                      strokeWidth={2}
                      strokeDasharray={k === curMonthKey ? undefined : '4 4'}
                      fill={`url(#fillMonth-${k})`}
                      connectNulls
                    />
                  ))}
                  {GOAL_VALUES.filter(g => goals[g.key]).map(g => (
                    <ReferenceLine
                      key={g.key}
                      y={g.value}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="6 4"
                      strokeOpacity={0.7}
                      label={{ value: `Meta ${g.label}`, position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>

              {/* Legenda customizada */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border">
                {activeMonthKeys.map(k => (
                  <div key={k} className="flex items-center gap-1.5 text-xs">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: monthColorMap[k] }} />
                    <span className="text-muted-foreground">
                      {formatMonthLabel(parseMonthKey(k))}{k === curMonthKey ? ' (Atual)' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Faturamento por Dia</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData}>
                    <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <RTooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Serviços por Status</h3>
                {statusCounts.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={statusCounts} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                          {statusCounts.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {statusCounts.map(s => (
                        <div key={s.name} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                          <span className="text-foreground">{s.name}: {s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <p className="text-muted-foreground text-sm">Sem dados</p>}
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Pagamentos</h3>
                {paymentCounts.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={paymentCounts} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                          {paymentCounts.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {paymentCounts.map(s => (
                        <div key={s.name} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                          <span className="text-foreground">{s.name}: {s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <p className="text-muted-foreground text-sm">Sem dados</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
