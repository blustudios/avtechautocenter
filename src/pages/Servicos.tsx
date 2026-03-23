import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StatusBadge, PaymentBadge } from '@/components/StatusBadge';
import { formatCurrency } from '@/lib/format';
import { Plus, Search, CalendarIcon, MoreHorizontal, Pencil, Trash2, Zap, UserPlus, RefreshCw, ArrowUpDown, ChevronRight } from 'lucide-react';
import { ServiceDialog } from '@/components/services/ServiceDialog';
import { ServiceViewDialog } from '@/components/services/ServiceViewDialog';
import { ClientDialog } from '@/components/clients/ClientDialog';
import { format, subDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Servico {
  id: string;
  cliente_cpf: string;
  carro_placa: string;
  carro_marca?: string;
  carro_modelo?: string;
  data_entrada: string;
  status: string;
  status_pagamento: string;
  valor_total: number;
  lucro_liquido: number;
  cliente?: { nome: string };
  carro?: { marca: string; modelo: string; placa: string };
  primeira_data_pagamento?: string;
  pagamentos?: { data_pagamento: string | null; pago: boolean }[];
}

type DatePreset = 'all' | '3days' | '7days' | 'custom';
type SortField = 'data_entrada' | 'data_pagamento' | 'id';
type SortDirection = 'asc' | 'desc';

export default function Servicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [viewService, setViewService] = useState<string | null>(null);
  const [editService, setEditService] = useState<string | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('data_entrada');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Advanced filters
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [paymentDateFrom, setPaymentDateFrom] = useState<Date | undefined>();
  const [paymentDateTo, setPaymentDateTo] = useState<Date | undefined>();

  const fetchServicos = async () => {
    const { data } = await supabase
      .from('servicos')
      .select('*, clientes(nome), carros(marca, modelo, placa), servicos_pagamentos(data_pagamento, pago)')
      .order('created_at', { ascending: false });
    if (data) {
      setServicos(data.map((s: any) => {
        const pagamentos = (s.servicos_pagamentos || []) as { data_pagamento: string | null; pago: boolean }[];
        const sortedDates = pagamentos
          .map(p => p.data_pagamento)
          .filter(Boolean)
          .sort();
        return {
          ...s,
          cliente: s.clientes,
          carro: s.carros,
          pagamentos,
          primeira_data_pagamento: sortedDates[0] || undefined,
        };
      }));
    }
    setLoading(false);
  };

  useEffect(() => { fetchServicos(); }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchServicos();
    toast.success('Atualizado!');
  };

  const getDateRange = (): { from: Date | null; to: Date | null } => {
    if (datePreset === '3days') return { from: subDays(new Date(), 3), to: new Date() };
    if (datePreset === '7days') return { from: subDays(new Date(), 7), to: new Date() };
    if (datePreset === 'custom') return { from: dateFrom || null, to: dateTo || null };
    return { from: null, to: null };
  };

  const filtered = servicos.filter(s => {
    const searchLower = search.toLowerCase();
    const matchSearch = !search || 
      s.id.toLowerCase().includes(searchLower) ||
      s.cliente?.nome?.toLowerCase().includes(searchLower) ||
      s.carro?.placa?.toLowerCase().includes(searchLower);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchPayment = paymentFilter === 'all' || s.status_pagamento === paymentFilter;

    const { from, to } = getDateRange();
    let matchDate = true;
    if (from || to) {
      const entryDate = startOfDay(new Date(s.data_entrada + 'T00:00:00'));
      if (from) matchDate = matchDate && !isBefore(entryDate, startOfDay(from));
      if (to) matchDate = matchDate && !isAfter(entryDate, startOfDay(to));
    }

    // Payment date filter
    let matchPaymentDate = true;
    if (paymentDateFrom) {
      const pFrom = startOfDay(paymentDateFrom);
      if (paymentDateTo) {
        const pTo = startOfDay(paymentDateTo);
        matchPaymentDate = (s.pagamentos || []).some(p => {
          if (!p.data_pagamento) return false;
          const pd = startOfDay(new Date(p.data_pagamento + 'T00:00:00'));
          return !isBefore(pd, pFrom) && !isAfter(pd, pTo);
        });
      } else {
        matchPaymentDate = (s.pagamentos || []).some(p => {
          if (!p.data_pagamento) return false;
          const pd = startOfDay(new Date(p.data_pagamento + 'T00:00:00'));
          return pd.getTime() === pFrom.getTime();
        });
      }
    }

    return matchSearch && matchStatus && matchPayment && matchDate && matchPaymentDate;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let valA: string | undefined;
    let valB: string | undefined;

    if (sortField === 'data_entrada') {
      valA = a.data_entrada;
      valB = b.data_entrada;
    } else if (sortField === 'id') {
      valA = a.id;
      valB = b.id;
    } else {
      valA = a.primeira_data_pagamento;
      valB = b.primeira_data_pagamento;
    }

    // Items without value go to the end
    if (!valA && !valB) return 0;
    if (!valA) return 1;
    if (!valB) return -1;

    const cmp = valA.localeCompare(valB);
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-foreground shrink-0">Entradas de Serviço</h1>
        <div className="flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setShowNewClient(true)} className="shrink-0 border-border h-9 w-9">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Novo Cliente</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleRefresh} className="shrink-0 border-border h-9 w-9">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline" size="sm" onClick={() => setShowQuickCreate(true)} className="shrink-0 border-primary/50 text-primary hover:bg-primary/10 h-9 px-2.5 sm:px-3">
            <Zap className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Rápido</span>
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="shrink-0 h-9 px-2.5 sm:px-3">
            <Plus className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Novo</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, placa ou ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-card border-border"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="a_iniciar">À Iniciar</SelectItem>
            <SelectItem value="em_progresso">Em Progresso</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-card border-border"><SelectValue placeholder="Pagamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="pendente">Aguardando Pagamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date filter + Sort */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground shrink-0">Período:</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(['all', '3days', '7days', 'custom'] as DatePreset[]).map(preset => (
                <Button key={preset} variant={datePreset === preset ? 'default' : 'outline'} size="sm" className="shrink-0 text-xs sm:text-sm"
                  onClick={() => { setDatePreset(preset); if (preset !== 'custom') { setDateFrom(undefined); setDateTo(undefined); } }}>
                  {preset === 'all' ? 'Todos' : preset === '3days' ? '3 dias' : preset === '7days' ? '7 dias' : 'Personalizado'}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[160px] bg-card border-border h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data_entrada">Data de Entrada</SelectItem>
                <SelectItem value="data_pagamento">Data de Pagamento</SelectItem>
                <SelectItem value="id">ID do Serviço</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}>
              <ArrowUpDown className={cn("w-4 h-4 transition-transform", sortDirection === 'asc' && "rotate-180")} />
            </Button>
          </div>
        </div>
        {datePreset === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('gap-1.5 w-full sm:w-auto', !dateFrom && 'text-muted-foreground')}>
                  <CalendarIcon className="w-3.5 h-3.5" />{dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Data início'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" locale={ptBR} /></PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm hidden sm:inline">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('gap-1.5 w-full sm:w-auto', !dateTo && 'text-muted-foreground')}>
                  <CalendarIcon className="w-3.5 h-3.5" />{dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Data fim'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" locale={ptBR} /></PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ChevronRight className={cn("w-4 h-4 transition-transform", advancedOpen && "rotate-90")} />
          <span className="font-medium">Filtros Avançados</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <span className="text-sm text-muted-foreground shrink-0">Data de Pagamento:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('gap-1.5 w-full sm:w-auto', !paymentDateFrom && 'text-muted-foreground')}>
                  <CalendarIcon className="w-3.5 h-3.5" />{paymentDateFrom ? format(paymentDateFrom, 'dd/MM/yyyy') : 'Data início'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={paymentDateFrom} onSelect={setPaymentDateFrom} initialFocus className="p-3 pointer-events-auto" locale={ptBR} /></PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm hidden sm:inline">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('gap-1.5 w-full sm:w-auto', !paymentDateTo && 'text-muted-foreground')}>
                  <CalendarIcon className="w-3.5 h-3.5" />{paymentDateTo ? format(paymentDateTo, 'dd/MM/yyyy') : 'Data fim'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={paymentDateTo} onSelect={setPaymentDateTo} initialFocus className="p-3 pointer-events-auto" locale={ptBR} /></PopoverContent>
            </Popover>
            {(paymentDateFrom || paymentDateTo) && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => { setPaymentDateFrom(undefined); setPaymentDateTo(undefined); }}>
                Limpar
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          {servicos.length === 0 ? 'Nenhum serviço cadastrado. Crie o primeiro!' : 'Nenhum resultado encontrado.'}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(s => (
            <div key={s.id} onClick={() => setViewService(s.id)}
              className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-sm text-primary font-semibold">{s.id}</span>
                  <StatusBadge status={s.status} />
                  <PaymentBadge status={s.status_pagamento} />
                </div>
                <p className="text-foreground font-medium truncate">{s.cliente?.nome || <span className="italic text-muted-foreground">Serviço Rápido</span>}</p>
                <p className="text-sm text-muted-foreground">
                  {s.carro
                    ? `${s.carro.marca} ${s.carro.modelo} · ${s.carro.placa}`
                    : s.carro_marca || s.carro_modelo
                      ? `${s.carro_marca || ''} ${s.carro_modelo || ''} · Sem Placa`.trim()
                      : '—'}
                  {' · '}{new Date(s.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(Number(s.valor_total))}</p>
                  <p className={cn("text-xs font-medium", Number(s.lucro_liquido) >= 0 ? "text-emerald-500" : "text-destructive")}>
                    Lucro: {formatCurrency(Number(s.lucro_liquido))}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditService(s.id); }}><Pencil className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); setDeleteServiceId(s.id); }} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <ServiceDialog open={showCreate} onClose={() => { setShowCreate(false); fetchServicos(); }} />}
      {showQuickCreate && <ServiceDialog open={showQuickCreate} quickMode onClose={() => { setShowQuickCreate(false); fetchServicos(); }} />}
      {showNewClient && <ClientDialog open={showNewClient} onClose={() => { setShowNewClient(false); fetchServicos(); }} onSaveAndService={() => { setShowNewClient(false); setShowCreate(true); }} />}
      {viewService && (
        <ServiceViewDialog serviceId={viewService} open={!!viewService}
          onClose={() => { setViewService(null); fetchServicos(); }}
          onEdit={(id) => { setViewService(null); setEditService(id); }} />
      )}
      {editService && <ServiceDialog open={!!editService} serviceId={editService} onClose={() => { setEditService(null); fetchServicos(); }} />}

      <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
            <AlertDialogDescription>Deseja excluir essa entrada permanentemente?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const id = deleteServiceId!;
                await supabase.from('servicos_pneus').delete().eq('servico_id', id);
                await supabase.from('servicos_itens').delete().eq('servico_id', id);
                await supabase.from('servicos_pagamentos').delete().eq('servico_id', id);
                await supabase.from('servicos_custos').delete().eq('servico_id', id);
                await supabase.from('servicos').delete().eq('id', id);
                toast.success('Serviço excluído!');
                setDeleteServiceId(null);
                fetchServicos();
              }}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
