import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { ServiceViewDialog } from '@/components/services/ServiceViewDialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { formatCurrency } from '@/lib/format';
import { format, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, CalendarIcon, Search, Download, RefreshCw, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type DatePreset = 'mes' | 'mes_passado' | 'semana' | 'ontem' | 'hoje' | 'custom';

const PAGE_SIZE = 25;
const SEM_FORNECEDOR = '__sem__';

interface CustoRow {
  id: string;
  data_compra: string | null;
  item: string;
  quantidade: number;
  valor: number;
  fornecedor_id: string | null;
  servico_id: string;
  fornecedor?: { nome: string } | null;
  servico?: {
    id: string;
    status: string;
    data_entrada: string;
    cliente_cpf: string | null;
    carro_placa: string | null;
    carro_marca: string | null;
    carro_modelo: string | null;
    carro_placa_livre: string | null;
    carro_marca_livre: string | null;
    carro_modelo_livre: string | null;
    cliente?: { nome: string } | null;
  } | null;
}

interface Fornecedor { id: string; nome: string }

export default function RelatorioCustos() {
  const [rows, setRows] = useState<CustoRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [resumo, setResumo] = useState({ total_valor: 0, total_itens: 0, total_quantidade: 0, total_servicos: 0 });
  const [resumoLoading, setResumoLoading] = useState(true);

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorFilter, setFornecedorFilter] = useState<string>('all');

  const [itemSearch, setItemSearch] = useState('');
  const [debouncedItem, setDebouncedItem] = useState('');
  const [servicoIdSearch, setServicoIdSearch] = useState('');
  const [debouncedServicoId, setDebouncedServicoId] = useState('');

  const [datePreset, setDatePreset] = useState<DatePreset>('mes');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const [viewService, setViewService] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Load fornecedores once
  useEffect(() => {
    supabase.from('fornecedores').select('id, nome').order('nome').then(({ data }) => {
      if (data) setFornecedores(data);
    });
  }, []);

  // Debounce search inputs
  useEffect(() => { const t = setTimeout(() => setDebouncedItem(itemSearch), 350); return () => clearTimeout(t); }, [itemSearch]);
  useEffect(() => { const t = setTimeout(() => setDebouncedServicoId(servicoIdSearch), 350); return () => clearTimeout(t); }, [servicoIdSearch]);

  const getDateRange = useCallback((): { from: Date | null; to: Date | null } => {
    const today = new Date();
    if (datePreset === 'hoje') return { from: today, to: today };
    if (datePreset === 'ontem') { const y = subDays(today, 1); return { from: y, to: y }; }
    if (datePreset === 'semana') return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
    if (datePreset === 'mes') return { from: startOfMonth(today), to: endOfMonth(today) };
    if (datePreset === 'mes_passado') { const lm = subMonths(today, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
    if (datePreset === 'custom') {
      if (dateFrom && !dateTo) return { from: dateFrom, to: dateFrom };
      return { from: dateFrom || null, to: dateTo || null };
    }
    return { from: null, to: null };
  }, [datePreset, dateFrom, dateTo]);

  const filterParams = useMemo(() => {
    const { from, to } = getDateRange();
    return {
      data_from: from ? format(startOfDay(from), 'yyyy-MM-dd') : null,
      data_to: to ? format(startOfDay(to), 'yyyy-MM-dd') : null,
      fornecedor_id: fornecedorFilter !== 'all' && fornecedorFilter !== SEM_FORNECEDOR ? fornecedorFilter : null,
      sem_fornecedor: fornecedorFilter === SEM_FORNECEDOR,
      item: debouncedItem.trim() || null,
      servico_id: debouncedServicoId.trim() || null,
    };
  }, [getDateRange, fornecedorFilter, debouncedItem, debouncedServicoId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('servicos_custos')
      .select(`id, data_compra, item, quantidade, valor, fornecedor_id, servico_id,
               fornecedor:fornecedores(nome),
               servico:servicos!inner(id, status, data_entrada, cliente_cpf, carro_placa, carro_marca, carro_modelo,
                                     carro_placa_livre, carro_marca_livre, carro_modelo_livre,
                                     cliente:clientes(nome))`, { count: 'exact' });

    if (filterParams.data_from) q = q.gte('data_compra', filterParams.data_from);
    if (filterParams.data_to) q = q.lte('data_compra', filterParams.data_to);
    if (filterParams.sem_fornecedor) q = q.is('fornecedor_id', null);
    else if (filterParams.fornecedor_id) q = q.eq('fornecedor_id', filterParams.fornecedor_id);
    if (filterParams.item) q = q.ilike('item', `%${filterParams.item}%`);
    if (filterParams.servico_id) q = q.ilike('servico_id', `%${filterParams.servico_id}%`);

    q = q.order('data_compra', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
    const rangeFrom = page * PAGE_SIZE;
    q = q.range(rangeFrom, rangeFrom + PAGE_SIZE - 1);

    const { data, count, error } = await q;
    if (error) {
      toast.error('Erro ao carregar custos');
      console.error(error);
    } else {
      setRows((data as any) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [filterParams, page]);

  const fetchResumo = useCallback(async () => {
    setResumoLoading(true);
    const { data, error } = await supabase.rpc('relatorio_custos_resumo', {
      p_data_from: filterParams.data_from,
      p_data_to: filterParams.data_to,
      p_fornecedor_id: filterParams.fornecedor_id,
      p_sem_fornecedor: filterParams.sem_fornecedor,
      p_item: filterParams.item,
      p_servico_id: filterParams.servico_id,
    });
    if (!error && data && data[0]) {
      const r = data[0] as any;
      setResumo({
        total_valor: Number(r.total_valor) || 0,
        total_itens: Number(r.total_itens) || 0,
        total_quantidade: Number(r.total_quantidade) || 0,
        total_servicos: Number(r.total_servicos) || 0,
      });
    }
    setResumoLoading(false);
  }, [filterParams]);

  useEffect(() => { setPage(0); }, [filterParams]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchResumo(); }, [fetchResumo]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const datePresets: { label: string; value: DatePreset }[] = [
    { label: 'Este Mês', value: 'mes' },
    { label: 'Mês Passado', value: 'mes_passado' },
    { label: 'Esta Semana', value: 'semana' },
    { label: 'Ontem', value: 'ontem' },
    { label: 'Hoje', value: 'hoje' },
    { label: 'Personalizado', value: 'custom' },
  ];

  const clearFilters = () => {
    setDatePreset('mes');
    setDateFrom(undefined);
    setDateTo(undefined);
    setFornecedorFilter('all');
    setItemSearch('');
    setServicoIdSearch('');
  };

  const veiculoLabel = (s: CustoRow['servico']) => {
    if (!s) return '—';
    const marca = s.carro_marca || s.carro_marca_livre || '';
    const modelo = s.carro_modelo || s.carro_modelo_livre || '';
    const placa = s.carro_placa || s.carro_placa_livre || '';
    const parts = [marca, modelo].filter(Boolean).join(' ');
    return [parts, placa].filter(Boolean).join(' • ') || '—';
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const LIMIT = 5000;
      let q = supabase
        .from('servicos_custos')
        .select(`id, data_compra, item, quantidade, valor, servico_id,
                 fornecedor:fornecedores(nome),
                 servico:servicos!inner(id, status, data_entrada, carro_placa, carro_marca, carro_modelo,
                                       carro_placa_livre, carro_marca_livre, carro_modelo_livre,
                                       cliente:clientes(nome))`);
      if (filterParams.data_from) q = q.gte('data_compra', filterParams.data_from);
      if (filterParams.data_to) q = q.lte('data_compra', filterParams.data_to);
      if (filterParams.sem_fornecedor) q = q.is('fornecedor_id', null);
      else if (filterParams.fornecedor_id) q = q.eq('fornecedor_id', filterParams.fornecedor_id);
      if (filterParams.item) q = q.ilike('item', `%${filterParams.item}%`);
      if (filterParams.servico_id) q = q.ilike('servico_id', `%${filterParams.servico_id}%`);
      q = q.order('data_compra', { ascending: false }).limit(LIMIT);
      const { data } = await q;
      if (!data || data.length === 0) { toast.error('Nada para exportar'); return; }

      const escape = (v: any) => {
        const s = v == null ? '' : String(v);
        return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ['Data Compra', 'Item', 'Qtd', 'Valor Unit.', 'Valor Total', 'Fornecedor', 'ID Serviço', 'Status', 'Cliente', 'Veículo'];
      const lines = [header.join(';')];
      for (const r of data as any[]) {
        const qt = Number(r.quantidade) || 0;
        const v = Number(r.valor) || 0;
        const unit = qt > 0 ? v / qt : v;
        lines.push([
          r.data_compra || '',
          r.item,
          qt,
          unit.toFixed(2).replace('.', ','),
          v.toFixed(2).replace('.', ','),
          r.fornecedor?.nome || '',
          r.servico_id,
          r.servico?.status || '',
          r.servico?.cliente?.nome || '',
          veiculoLabel(r.servico),
        ].map(escape).join(';'));
      }
      const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `custos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${data.length} registros exportados`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <Link to="/relatorios" className="hover:text-foreground">Relatórios</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground">Custos</span>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Relatório de Custos</h1>
            <p className="text-xs text-muted-foreground">Todos os custos lançados nos serviços.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchData(); fetchResumo(); }} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting || resumo.total_itens === 0}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </header>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Filtrado</p>
            {resumoLoading ? <Skeleton className="h-7 w-32 mt-1" /> : (
              <p className="text-xl sm:text-2xl font-bold text-destructive">{formatCurrency(resumo.total_valor)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Lançamentos</p>
            {resumoLoading ? <Skeleton className="h-7 w-16 mt-1" /> : (
              <p className="text-xl sm:text-2xl font-bold">{resumo.total_itens}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Qtd. Total</p>
            {resumoLoading ? <Skeleton className="h-7 w-16 mt-1" /> : (
              <p className="text-xl sm:text-2xl font-bold">{Number(resumo.total_quantidade).toLocaleString('pt-BR')}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Serviços envolvidos</p>
            {resumoLoading ? <Skeleton className="h-7 w-16 mt-1" /> : (
              <p className="text-xl sm:text-2xl font-bold">{resumo.total_servicos}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {datePresets.map(p => (
              <Button key={p.value} variant={datePreset === p.value ? 'default' : 'outline'} size="sm"
                onClick={() => { setDatePreset(p.value); if (p.value !== 'custom') { setDateFrom(undefined); setDateTo(undefined); } }}>
                {p.label}
              </Button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start font-normal">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'De'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start font-normal">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Até'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar item..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
              <SelectTrigger><SelectValue placeholder="Fornecedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os fornecedores</SelectItem>
                <SelectItem value={SEM_FORNECEDOR}>Sem fornecedor</SelectItem>
                {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="ID do serviço..." value={servicoIdSearch} onChange={e => setServicoIdSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">Nenhum custo encontrado para os filtros.</CardContent></Card>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left p-3">Data</th>
                      <th className="text-left p-3">Item</th>
                      <th className="text-right p-3">Qtd</th>
                      <th className="text-right p-3">Unit.</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-left p-3">Fornecedor</th>
                      <th className="text-left p-3">Serviço</th>
                      <th className="text-left p-3">Cliente / Veículo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const qt = Number(r.quantidade) || 0;
                      const v = Number(r.valor) || 0;
                      const unit = qt > 0 ? v / qt : v;
                      return (
                        <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                          <td className="p-3 whitespace-nowrap">{r.data_compra ? format(new Date(r.data_compra + 'T00:00'), 'dd/MM/yy') : '—'}</td>
                          <td className="p-3">{r.item}</td>
                          <td className="p-3 text-right">{qt}</td>
                          <td className="p-3 text-right text-muted-foreground">{formatCurrency(unit)}</td>
                          <td className="p-3 text-right font-semibold text-destructive">{formatCurrency(v)}</td>
                          <td className="p-3">{r.fornecedor?.nome || <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-3">
                            <button onClick={() => setViewService(r.servico_id)} className="text-primary hover:underline font-mono text-xs">
                              {r.servico_id}
                            </button>
                            <div className="mt-1"><StatusBadge status={r.servico?.status || ''} /></div>
                          </td>
                          <td className="p-3">
                            <div>{r.servico?.cliente?.nome || <span className="text-muted-foreground">—</span>}</div>
                            <div className="text-xs text-muted-foreground">{veiculoLabel(r.servico)}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {rows.map(r => {
              const qt = Number(r.quantidade) || 0;
              const v = Number(r.valor) || 0;
              return (
                <Card key={r.id}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{r.item}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.data_compra ? format(new Date(r.data_compra + 'T00:00'), 'dd/MM/yyyy') : 'sem data'} · Qtd {qt}
                        </p>
                      </div>
                      <p className="font-bold text-destructive whitespace-nowrap">{formatCurrency(v)}</p>
                    </div>
                    <div className="mt-2 text-xs space-y-0.5">
                      <p><span className="text-muted-foreground">Fornecedor:</span> {r.fornecedor?.nome || '—'}</p>
                      <p><span className="text-muted-foreground">Cliente:</span> {r.servico?.cliente?.nome || '—'}</p>
                      <p><span className="text-muted-foreground">Veículo:</span> {veiculoLabel(r.servico)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <button onClick={() => setViewService(r.servico_id)} className="text-primary hover:underline font-mono text-xs">
                        {r.servico_id}
                      </button>
                      <StatusBadge status={r.servico?.status || ''} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}</span>
            {totalPages > 1 && (
              <Pagination className="mx-0 justify-end w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={(e) => { e.preventDefault(); setPage(p => Math.max(0, p - 1)); }}
                      className={cn('cursor-pointer', page === 0 && 'pointer-events-none opacity-50')} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink isActive>{page + 1} / {totalPages}</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext onClick={(e) => { e.preventDefault(); setPage(p => Math.min(totalPages - 1, p + 1)); }}
                      className={cn('cursor-pointer', page >= totalPages - 1 && 'pointer-events-none opacity-50')} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </>
      )}

      <ServiceViewDialog serviceId={viewService} open={!!viewService} onClose={() => setViewService(null)} onEdit={() => {}} />
    </div>
  );
}
