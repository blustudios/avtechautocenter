import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { StatusBadge, PaymentBadge } from '@/components/StatusBadge';
import { formatCurrency } from '@/lib/format';
import { Plus, Search, CalendarIcon, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { ServiceDialog } from '@/components/services/ServiceDialog';
import { ServiceViewDialog } from '@/components/services/ServiceViewDialog';
import { format, subDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Servico {
  id: string;
  cliente_cpf: string;
  carro_placa: string;
  data_entrada: string;
  status: string;
  status_pagamento: string;
  valor_total: number;
  cliente?: { nome: string };
  carro?: { marca: string; modelo: string; placa: string };
}

type DatePreset = 'all' | '3days' | '7days' | 'custom';

export default function Servicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [viewService, setViewService] = useState<string | null>(null);
  const [editService, setEditService] = useState<string | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchServicos = async () => {
    const { data } = await supabase
      .from('servicos')
      .select('*, clientes(nome), carros(marca, modelo, placa)')
      .order('created_at', { ascending: false });
    if (data) {
      setServicos(data.map((s: any) => ({
        ...s,
        cliente: s.clientes,
        carro: s.carros,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchServicos(); }, []);

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

    return matchSearch && matchStatus && matchPayment && matchDate;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Entradas de Serviço</h1>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, placa ou ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="a_iniciar">À Iniciar</SelectItem>
            <SelectItem value="em_progresso">Em Progresso</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-card border-border">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="pendente">Aguardando Pagamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date filter */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground shrink-0">Período:</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(['all', '3days', '7days', 'custom'] as DatePreset[]).map(preset => (
              <Button
                key={preset}
                variant={datePreset === preset ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 text-xs sm:text-sm"
                onClick={() => { setDatePreset(preset); if (preset !== 'custom') { setDateFrom(undefined); setDateTo(undefined); } }}
              >
                {preset === 'all' ? 'Todos' : preset === '3days' ? '3 dias' : preset === '7days' ? '7 dias' : 'Personalizado'}
              </Button>
            ))}
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('gap-1.5 w-full sm:w-auto', !dateFrom && 'text-muted-foreground')}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Data início'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm hidden sm:inline">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('gap-1.5 w-full sm:w-auto', !dateTo && 'text-muted-foreground')}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Data fim'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          {servicos.length === 0 ? 'Nenhum serviço cadastrado. Crie o primeiro!' : 'Nenhum resultado encontrado.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <div
              key={s.id}
              onClick={() => setViewService(s.id)}
              className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-sm text-primary font-semibold">{s.id}</span>
                  <StatusBadge status={s.status} />
                  <PaymentBadge status={s.status_pagamento} />
                </div>
                <p className="text-foreground font-medium truncate">{s.cliente?.nome || '—'}</p>
                <p className="text-sm text-muted-foreground">
                  {s.carro ? `${s.carro.marca} ${s.carro.modelo} · ${s.carro.placa}` : '—'}
                  {' · '}{new Date(s.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-foreground">{formatCurrency(Number(s.valor_total))}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <ServiceDialog
          open={showCreate}
          onClose={() => { setShowCreate(false); fetchServicos(); }}
        />
      )}
      {viewService && (
        <ServiceViewDialog
          serviceId={viewService}
          open={!!viewService}
          onClose={() => { setViewService(null); fetchServicos(); }}
          onEdit={(id) => { setViewService(null); setEditService(id); }}
        />
      )}
      {editService && (
        <ServiceDialog
          open={!!editService}
          serviceId={editService}
          onClose={() => { setEditService(null); fetchServicos(); }}
        />
      )}
    </div>
  );
}
