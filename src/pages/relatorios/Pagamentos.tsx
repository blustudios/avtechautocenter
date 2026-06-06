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
import { ServiceViewDialog } from '@/components/services/ServiceViewDialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { formatCurrency, tiposPagamento } from '@/lib/format';
import { format, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, CalendarIcon, Search, Download, RefreshCw, Wallet, ExternalLink, AlertTriangle, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { findPagamentoErrors } from '@/lib/payments';
import { EditPagamentoDialog } from '@/components/relatorios/EditPagamentoDialog';

type DatePreset = 'mes' | 'mes_passado' | 'semana' | 'ontem' | 'hoje' | 'custom';

const PAGE_SIZE = 25;
const SEM_MAQUININHA = '__sem__';

interface PagamentoRow {
  id: string;
  data_pagamento: string | null;
  tipo: string;
  valor: number;
  taxa_aplicada: number;
  parcelas: number | null;
  pago: boolean;
  maquininha_id: string | null;
  bandeira_id: string | null;
  servico_id: string;
  maquininha?: { nome: string } | null;
  bandeira?: { nome: string } | null;
  servico?: {
    id: string;
    status: string;
    status_pagamento: string;
    data_entrada: string;
    carro_placa: string | null;
    carro_marca: string | null;
    carro_modelo: string | null;
    carro_placa_livre: string | null;
    carro_marca_livre: string | null;
    carro_modelo_livre: string | null;
    cliente?: { nome: string } | null;
  } | null;
}

interface Maquininha { id: string; nome: string }
interface Bandeira { id: string; nome: string; maquininha_id: string }

export default function RelatorioPagamentos() {
  const [rows, setRows] = useState<PagamentoRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [resumo, setResumo] = useState({ total_pago: 0, total_pendente: 0, total_taxas: 0, total_itens: 0, total_servicos: 0 });
  const [resumoLoading, setResumoLoading] = useState(true);

  const [maquininhas, setMaquininhas] = useState<Maquininha[]>([]);
  const [bandeiras, setBandeiras] = useState<Bandeira[]>([]);

  const [statusFilter, setStatusFilter] = useState<'todos' | 'pago' | 'pendente'>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [maquininhaFilter, setMaquininhaFilter] = useState<string>('all');
  const [bandeiraFilter, setBandeiraFilter] = useState<string>('all');

  const [servicoIdSearch, setServicoIdSearch] = useState('');
  const [debouncedServicoId, setDebouncedServicoId] = useState('');

  const [datePreset, setDatePreset] = useState<DatePreset>('mes');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const [viewService, setViewService] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editPagamentoId, setEditPagamentoId] = useState<string | null>(null);

  // Modo auditoria ("Buscar erros")
  const [auditMode, setAuditMode] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditRows, setAuditRows] = useState<(PagamentoRow & { _errors: string[] })[]>([]);

  useEffect(() => {
    supabase.from('maquininhas').select('id, nome').order('nome').then(({ data }) => {
      if (data) setMaquininhas(data);
    });
    supabase.from('bandeiras').select('id, nome, maquininha_id').order('nome').then(({ data }) => {
      if (data) setBandeiras(data);
    });
  }, []);

  useEffect(() => { const t = setTimeout(() => setDebouncedServicoId(servicoIdSearch), 350); return () => clearTimeout(t); }, [servicoIdSearch]);

  // Reset bandeira when maquininha changes incompatibly
  useEffect(() => {
    if (bandeiraFilter !== 'all') {
      const b = bandeiras.find(x => x.id === bandeiraFilter);
      if (b && maquininhaFilter !== 'all' && maquininhaFilter !== SEM_MAQUININHA && b.maquininha_id !== maquininhaFilter) {
        setBandeiraFilter('all');
      }
    }
  }, [maquininhaFilter, bandeiraFilter, bandeiras]);

  const bandeirasFiltradas = useMemo(() => {
    if (maquininhaFilter === 'all' || maquininhaFilter === SEM_MAQUININHA) return bandeiras;
    return bandeiras.filter(b => b.maquininha_id === maquininhaFilter);
  }, [bandeiras, maquininhaFilter]);

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
      status: statusFilter,
      tipo: tipoFilter !== 'all' ? tipoFilter : null,
      maquininha_id: maquininhaFilter !== 'all' && maquininhaFilter !== SEM_MAQUININHA ? maquininhaFilter : null,
      sem_maquininha: maquininhaFilter === SEM_MAQUININHA,
      bandeira_id: bandeiraFilter !== 'all' ? bandeiraFilter : null,
      servico_id: debouncedServicoId.trim() || null,
    };
  }, [getDateRange, statusFilter, tipoFilter, maquininhaFilter, bandeiraFilter, debouncedServicoId]);

  const applyFiltersToQuery = useCallback((q: any) => {
    if (filterParams.data_from) q = q.gte('data_pagamento', filterParams.data_from);
    if (filterParams.data_to) q = q.lte('data_pagamento', filterParams.data_to);
    if (filterParams.status === 'pago') q = q.eq('pago', true);
    else if (filterParams.status === 'pendente') q = q.eq('pago', false);
    if (filterParams.tipo) q = q.eq('tipo', filterParams.tipo);
    if (filterParams.sem_maquininha) q = q.is('maquininha_id', null);
    else if (filterParams.maquininha_id) q = q.eq('maquininha_id', filterParams.maquininha_id);
    if (filterParams.bandeira_id) q = q.eq('bandeira_id', filterParams.bandeira_id);
    if (filterParams.servico_id) q = q.ilike('servico_id', `%${filterParams.servico_id}%`);
    return q;
  }, [filterParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('servicos_pagamentos')
      .select(`id, data_pagamento, tipo, valor, taxa_aplicada, parcelas, pago, maquininha_id, bandeira_id, servico_id,
               maquininha:maquininhas(nome), bandeira:bandeiras(nome),
               servico:servicos!inner(id, status, status_pagamento, data_entrada, carro_placa, carro_marca, carro_modelo,
                                     carro_placa_livre, carro_marca_livre, carro_modelo_livre,
                                     cliente:clientes(nome))`, { count: 'exact' });

    q = applyFiltersToQuery(q);
    q = q.order('data_pagamento', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
    const rangeFrom = page * PAGE_SIZE;
    q = q.range(rangeFrom, rangeFrom + PAGE_SIZE - 1);

    const { data, count, error } = await q;
    if (error) {
      toast.error('Erro ao carregar pagamentos');
      console.error(error);
    } else {
      setRows((data as any) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [applyFiltersToQuery, page]);

  const fetchResumo = useCallback(async () => {
    setResumoLoading(true);
    const { data, error } = await supabase.rpc('relatorio_pagamentos_resumo', {
      p_data_from: filterParams.data_from,
      p_data_to: filterParams.data_to,
      p_status: filterParams.status,
      p_tipo: filterParams.tipo,
      p_maquininha_id: filterParams.maquininha_id,
      p_sem_maquininha: filterParams.sem_maquininha,
      p_bandeira_id: filterParams.bandeira_id,
      p_servico_id: filterParams.servico_id,
    });
    if (!error && data && data[0]) {
      const r = data[0] as any;
      setResumo({
        total_pago: Number(r.total_pago) || 0,
        total_pendente: Number(r.total_pendente) || 0,
        total_taxas: Number(r.total_taxas) || 0,
        total_itens: Number(r.total_itens) || 0,
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
    setStatusFilter('todos');
    setTipoFilter('all');
    setMaquininhaFilter('all');
    setBandeiraFilter('all');
    setServicoIdSearch('');
  };

  const veiculoLabel = (s: PagamentoRow['servico']) => {
    if (!s) return '—';
    const marca = s.carro_marca || s.carro_marca_livre || '';
    const modelo = s.carro_modelo || s.carro_modelo_livre || '';
    const placa = s.carro_placa || s.carro_placa_livre || '';
    const parts = [marca, modelo].filter(Boolean).join(' ');
    return [parts, placa].filter(Boolean).join(' • ') || '—';
  };

  const liquido = (r: PagamentoRow) => Number(r.valor) * (1 - Number(r.taxa_aplicada || 0) / 100);
  const taxaValor = (r: PagamentoRow) => Number(r.valor) * Number(r.taxa_aplicada || 0) / 100;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const LIMIT = 5000;
      let q = supabase
        .from('servicos_pagamentos')
        .select(`id, data_pagamento, tipo, valor, taxa_aplicada, parcelas, pago, servico_id,
                 maquininha:maquininhas(nome), bandeira:bandeiras(nome),
                 servico:servicos!inner(id, status, carro_placa, carro_marca, carro_modelo,
                                       carro_placa_livre, carro_marca_livre, carro_modelo_livre,
                                       cliente:clientes(nome))`);
      q = applyFiltersToQuery(q);
      q = q.order('data_pagamento', { ascending: false, nullsFirst: false }).limit(LIMIT);
      const { data } = await q;
      if (!data || data.length === 0) { toast.error('Nada para exportar'); return; }

      const escape = (v: any) => {
        const s = v == null ? '' : String(v);
        return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ['Data Pagamento', 'Tipo', 'Maquininha', 'Bandeira', 'Parcelas', 'Valor Bruto', 'Taxa %', 'Taxa R$', 'Valor Líquido', 'Status', 'ID Serviço', 'Cliente', 'Veículo'];
      const lines = [header.join(';')];
      for (const r of data as any[]) {
        const v = Number(r.valor) || 0;
        const tx = Number(r.taxa_aplicada) || 0;
        const txV = v * tx / 100;
        const liq = v - txV;
        lines.push([
          r.data_pagamento || '',
          r.tipo,
          r.maquininha?.nome || '',
          r.bandeira?.nome || '',
          r.parcelas || '',
          v.toFixed(2).replace('.', ','),
          tx.toFixed(2).replace('.', ','),
          txV.toFixed(2).replace('.', ','),
          liq.toFixed(2).replace('.', ','),
          r.pago ? 'Pago' : 'Pendente',
          r.servico_id,
          r.servico?.cliente?.nome || '',
          veiculoLabel(r.servico),
        ].map(escape).join(';'));
      }
      const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pagamentos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${data.length} registros exportados`);
    } finally {
      setExporting(false);
    }
  };

  const taxaMedia = resumo.total_pago > 0 ? (resumo.total_taxas / resumo.total_pago) * 100 : 0;

  const runAudit = useCallback(async () => {
    setAuditMode(true);
    setAuditLoading(true);
    try {
      // Busca todos pagamentos potencialmente problemáticos (maquininha ou bandeira nulos
      // ou crédito parcelado sem parcelas). Filtra client-side pelas regras de tipo.
      const { data, error } = await supabase
        .from('servicos_pagamentos')
        .select(`id, data_pagamento, tipo, valor, taxa_aplicada, parcelas, pago, maquininha_id, bandeira_id, servico_id,
                 maquininha:maquininhas(nome), bandeira:bandeiras(nome),
                 servico:servicos!inner(id, status, status_pagamento, data_entrada, carro_placa, carro_marca, carro_modelo,
                                       carro_placa_livre, carro_marca_livre, carro_modelo_livre,
                                       cliente:clientes(nome))`)
        .or('maquininha_id.is.null,bandeira_id.is.null,parcelas.is.null')
        .limit(2000);
      if (error) throw error;
      const enriched = ((data as any[]) || [])
        .map(r => ({ ...r, _errors: findPagamentoErrors({
          tipo: r.tipo, maquininha_id: r.maquininha_id, bandeira_id: r.bandeira_id,
          parcelas: r.parcelas, pago: r.pago,
        }) }))
        .filter(r => r._errors.length > 0);
      setAuditRows(enriched);
      if (enriched.length === 0) toast.success('Nenhuma inconsistência encontrada!');
      else toast.info(`${enriched.length} pagamento(s) com inconsistências`);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao buscar inconsistências');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const exitAudit = () => { setAuditMode(false); setAuditRows([]); };

  const refreshAll = () => {
    if (auditMode) runAudit();
    else { fetchData(); fetchResumo(); }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <nav className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <Link to="/relatorios" className="hover:text-foreground">Relatórios</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground">Pagamentos</span>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Relatório de Pagamentos</h1>
            <p className="text-xs text-muted-foreground">Pagamentos registrados nos serviços.</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Recebido</p>
            {resumoLoading ? <Skeleton className="h-7 w-32 mt-1" /> : (
              <p className="text-xl sm:text-2xl font-bold text-status-pago">{formatCurrency(resumo.total_pago)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Pendente</p>
            {resumoLoading ? <Skeleton className="h-7 w-32 mt-1" /> : (
              <p className="text-xl sm:text-2xl font-bold text-primary">{formatCurrency(resumo.total_pendente)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Taxas (Pagos)</p>
            {resumoLoading ? <Skeleton className="h-7 w-32 mt-1" /> : (
              <>
                <p className="text-xl sm:text-2xl font-bold text-destructive">{formatCurrency(resumo.total_taxas)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Taxa média: {taxaMedia.toFixed(2)}%</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pagamentos</p>
            {resumoLoading ? <Skeleton className="h-7 w-16 mt-1" /> : (
              <p className="text-xl sm:text-2xl font-bold">{resumo.total_itens}</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {tiposPagamento.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={maquininhaFilter} onValueChange={setMaquininhaFilter}>
              <SelectTrigger><SelectValue placeholder="Maquininha" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as maquininhas</SelectItem>
                <SelectItem value={SEM_MAQUININHA}>Sem maquininha</SelectItem>
                {maquininhas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={bandeiraFilter} onValueChange={setBandeiraFilter}>
              <SelectTrigger><SelectValue placeholder="Bandeira" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as bandeiras</SelectItem>
                {bandeirasFiltradas.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
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
        <Card><CardContent className="p-10 text-center text-muted-foreground">Nenhum pagamento encontrado para os filtros.</CardContent></Card>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left p-3 font-medium">Data</th>
                      <th className="text-left p-3 font-medium">Tipo</th>
                      <th className="text-left p-3 font-medium">Maquininha / Bandeira</th>
                      <th className="text-right p-3 font-medium">Valor</th>
                      <th className="text-right p-3 font-medium">Taxa</th>
                      <th className="text-right p-3 font-medium">Líquido</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Serviço</th>
                      <th className="text-left p-3 font-medium">Cliente / Veículo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-3 whitespace-nowrap">
                          {r.data_pagamento ? format(new Date(r.data_pagamento + 'T00:00:00'), 'dd/MM/yyyy') : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3">
                          {r.tipo}
                          {r.parcelas && r.parcelas > 1 && <span className="text-xs text-muted-foreground ml-1">({r.parcelas}x)</span>}
                        </td>
                        <td className="p-3 text-xs">
                          {r.maquininha?.nome || <span className="text-muted-foreground">—</span>}
                          {r.bandeira?.nome && <div className="text-muted-foreground">{r.bandeira.nome}</div>}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap font-medium">{formatCurrency(Number(r.valor))}</td>
                        <td className="p-3 text-right whitespace-nowrap text-xs text-muted-foreground">
                          {Number(r.taxa_aplicada).toFixed(2)}%
                          <div className="text-destructive">-{formatCurrency(taxaValor(r))}</div>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap font-medium text-status-pago">{formatCurrency(liquido(r))}</td>
                        <td className="p-3 text-center">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            r.pago ? 'bg-status-entregue-bg text-status-pago' : 'bg-status-aguardando-bg text-status-pendente'
                          )}>
                            {r.pago ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-3">
                          <button onClick={() => setViewService(r.servico_id)} className="text-primary hover:underline inline-flex items-center gap-1 text-xs font-mono">
                            {r.servico_id} <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="p-3 text-xs">
                          <div>{r.servico?.cliente?.nome || <span className="text-muted-foreground">—</span>}</div>
                          <div className="text-muted-foreground">{veiculoLabel(r.servico)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile */}
          <div className="lg:hidden space-y-2">
            {rows.map(r => (
              <Card key={r.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{r.tipo}{r.parcelas && r.parcelas > 1 ? ` (${r.parcelas}x)` : ''}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.data_pagamento ? format(new Date(r.data_pagamento + 'T00:00:00'), 'dd/MM/yyyy') : 'Sem data'}
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
                      r.pago ? 'bg-status-entregue-bg text-status-pago' : 'bg-status-aguardando-bg text-status-pendente'
                    )}>
                      {r.pago ? 'Pago' : 'Pendente'}
                    </span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="text-xs text-muted-foreground">
                      {r.maquininha?.nome && <div>{r.maquininha.nome}{r.bandeira?.nome ? ` • ${r.bandeira.nome}` : ''}</div>}
                      {Number(r.taxa_aplicada) > 0 && <div>Taxa {Number(r.taxa_aplicada).toFixed(2)}% • Líq. {formatCurrency(liquido(r))}</div>}
                    </div>
                    <div className="text-lg font-bold">{formatCurrency(Number(r.valor))}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                    <button onClick={() => setViewService(r.servico_id)} className="text-primary inline-flex items-center gap-1 font-mono">
                      {r.servico_id} <ExternalLink className="w-3 h-3" />
                    </button>
                    <div className="text-right text-muted-foreground">
                      <div>{r.servico?.cliente?.nome || '—'}</div>
                      <div>{veiculoLabel(r.servico)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">
              Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
            </p>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (page > 0) setPage(page - 1); }} className={cn(page === 0 && 'pointer-events-none opacity-50')} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>{page + 1}</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <span className="px-2 text-xs text-muted-foreground">de {totalPages}</span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (page < totalPages - 1) setPage(page + 1); }} className={cn(page >= totalPages - 1 && 'pointer-events-none opacity-50')} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </>
      )}

      {viewService && (
        <ServiceViewDialog serviceId={viewService} open={!!viewService} onClose={() => setViewService(null)} onEdit={() => {}} />
      )}
    </div>
  );
}
