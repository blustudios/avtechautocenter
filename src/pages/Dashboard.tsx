import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wrench, Car, Calculator, CreditCard, Save, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, differenceInCalendarDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FilterType = 'hoje' | 'semana' | 'mes' | 'custom';

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
    case 'semana': return [startOfWeek(today, { weekStartsOn: 1 }), endOfWeek(today, { weekStartsOn: 1 })];
    case 'mes': return [startOfMonth(today), endOfMonth(today)];
    case 'custom': return [customStart || today, customEnd || today];
  }
}

function getPrevRange(start: Date, end: Date): [Date, Date] {
  return [subMonths(start, 1), subMonths(end, 1)];
}

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function countWorkingDays(start: Date, end: Date): number {
  const days = eachDayOfInterval({ start, end });
  return days.filter(d => { const dow = d.getDay(); return dow >= 1 && dow <= 6; }).length;
}

export default function Dashboard() {
  const saved = localStorage.getItem('dashboard_filter');
  const initial: SavedFilter = saved ? JSON.parse(saved) : { type: 'mes' };

  const [filterType, setFilterType] = useState<FilterType>(initial.type);
  const [customStart, setCustomStart] = useState<Date | undefined>(initial.customStart ? new Date(initial.customStart) : undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(initial.customEnd ? new Date(initial.customEnd) : undefined);
  const [dirty, setDirty] = useState(false);

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [prevPagamentos, setPrevPagamentos] = useState<Pagamento[]>([]);
  const [custosData, setCustosData] = useState<CustoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, endDate] = useMemo(() => getDateRange(filterType, customStart, customEnd), [filterType, customStart, customEnd]);
  const [prevStart, prevEnd] = useMemo(() => getPrevRange(startDate, endDate), [startDate, endDate]);

  useEffect(() => {
    setLoading(true);
    const s = toDateStr(startDate);
    const e = toDateStr(endDate);
    const ps = toDateStr(prevStart);
    const pe = toDateStr(prevEnd);

    // Fetch pagamentos - need to exclude orcamento/cancelado services
    // We join with servicos to filter by status
    Promise.all([
      supabase.from('servicos_pagamentos')
        .select('tipo, valor, taxa_aplicada, pago, data_pagamento, servico_id, servicos!inner(status)')
        .gte('data_pagamento', s).lte('data_pagamento', e)
        .not('servicos.status', 'in', '("orcamento","cancelado")'),
      supabase.from('servicos')
        .select('id, data_entrada, valor_total, custo_total, status, status_pagamento')
        .gte('data_entrada', s).lte('data_entrada', e)
        .not('status', 'in', '("orcamento","cancelado")'),
      supabase.from('servicos_pagamentos')
        .select('tipo, valor, taxa_aplicada, pago, data_pagamento, servico_id, servicos!inner(status)')
        .gte('data_pagamento', ps).lte('data_pagamento', pe)
        .not('servicos.status', 'in', '("orcamento","cancelado")'),
      supabase.from('servicos_custos')
        .select('valor, quantidade, data_compra, servicos!inner(status)')
        .not('data_compra', 'is', null)
        .gte('data_compra', s).lte('data_compra', e)
        .not('servicos.status', 'in', '("orcamento","cancelado")'),
    ]).then(([pRes, sRes, ppRes, cRes]) => {
      setPagamentos((pRes.data || []) as any as Pagamento[]);
      setServicos((sRes.data || []) as Servico[]);
      setPrevPagamentos((ppRes.data || []) as any as Pagamento[]);
      setCustosData((cRes.data || []) as any as CustoItem[]);
      setLoading(false);
    });
  }, [startDate, endDate, prevStart, prevEnd]);

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

  const totalDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
  const workDays = Math.max(1, countWorkingDays(startDate, endDate));
  const mediaCarrosDia = numServicos / workDays;
  const mediaFatDia = faturamento / totalDays;

  const contasReceber = validPagamentos.filter(p => !p.pago).reduce((s, p) => s + Number(p.valor), 0);

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
    { label: 'Faturamento', value: formatCurrency(faturamento), icon: DollarSign },
    { label: '(Faturamento) - (% Taxas)', value: formatCurrency(lucroLiquido), icon: TrendingUp },
    { label: 'Lucro Líquido', value: formatCurrency(lucroLiquidoReal), icon: TrendingUp },
    { label: 'Custos dos Serviços', value: formatCurrency(custoTotal), icon: TrendingDown },
    { label: 'Serviços', value: String(numServicos), icon: Wrench },
    { label: 'Ticket Médio', value: formatCurrency(ticketMedio), icon: Calculator },
    { label: 'Média Carros/Dia', value: mediaCarrosDia.toFixed(1), icon: Car },
    { label: 'Média Fat./Dia', value: formatCurrency(mediaFatDia), icon: DollarSign },
    { label: 'Contas a Receber', value: formatCurrency(contasReceber), icon: CreditCard },
  ];

  const filterButtons: { label: string; value: FilterType }[] = [
    { label: 'Hoje', value: 'hoje' },
    { label: 'Esta Semana', value: 'semana' },
    { label: 'Este Mês', value: 'mes' },
  ];

  return (
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
                  <span className="text-xs text-muted-foreground">{m.label}</span>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Faturamento por Dia</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip
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
  );
}
