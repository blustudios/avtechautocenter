import { useMemo, useState } from 'react';
import { useMonth } from '@/contexts/MonthContext';
import {
  useCategorias, useOrigens, useLancamentosManuais, useAutoLines, Lancamento,
} from '@/hooks/financeiro/useFinanceiroData';
import { formatCurrency } from '@/lib/format';
import { formatDateShort } from '@/lib/financeiro/dates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChevronDown, ChevronRight, MoreVertical, Plus, Lock, Search, StickyNote, CalendarIcon, X, ChevronsDownUp } from 'lucide-react';
import { LancamentoSaidaDialog } from './LancamentoSaidaDialog';
import { LancamentoEntradaDialog } from './LancamentoEntradaDialog';
import { DeleteRecurrenceDialog } from './DeleteRecurrenceDialog';
import { StatusPagamentoBadge } from './StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

export function TabLancamentos() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const { data: categorias } = useCategorias();
  const { data: origens } = useOrigens();
  const { data: manuais, isLoading } = useLancamentosManuais(month);
  const { data: auto } = useAutoLines(month, categorias, origens);

  const [openSaida, setOpenSaida] = useState(false);
  const [openEntrada, setOpenEntrada] = useState(false);
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [duplicating, setDuplicating] = useState<Lancamento | null>(null);
  const [deletingRec, setDeletingRec] = useState<Lancamento | null>(null);

  const [filtroCat, setFiltroCat] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  const [filtroHoje, setFiltroHoje] = useState(false);

  const hojeISO = new Date().toISOString().slice(0, 10);
  const hasFilters = filtroCat !== 'todas' || filtroStatus !== 'todos' || filtroOrigem !== 'todas' || busca !== '' || filtroHoje;
  const limparFiltros = () => {
    setFiltroCat('todas'); setFiltroStatus('todos'); setFiltroOrigem('todas'); setBusca(''); setFiltroHoje(false);
  };

  const [openEntradas, setOpenEntradas] = useState(true);
  const [openSaidas, setOpenSaidas] = useState(true);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const all: Lancamento[] = useMemo(() => {
    const list = [...(manuais || [])];
    if (auto) list.push(auto.entrada, auto.saida);
    return list;
  }, [manuais, auto]);

  const filtered = useMemo(() => {
    return all.filter(l => {
      if (filtroCat !== 'todas' && l.categoria_id !== filtroCat) return false;
      if (filtroStatus !== 'todos' && l.status_pagamento !== filtroStatus) return false;
      if (filtroOrigem !== 'todas' && l.origem_id !== filtroOrigem) return false;
      if (filtroHoje && l.data !== hojeISO) return false;
      if (busca && !l.descricao.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [all, filtroCat, filtroStatus, filtroOrigem, busca, filtroHoje, hojeISO]);

  const entradas = filtered.filter(l => l.tipo === 'entrada');
  const saidas = filtered.filter(l => l.tipo === 'saida');

  const totalEntradas = entradas.reduce((s, l) => s + Number(l.valor_realizado || 0), 0);
  const totalSaidas = saidas.reduce((s, l) => s + Number(l.valor_realizado || 0), 0);

  const saidasPorCat = useMemo(() => {
    const m = new Map<string, { nome: string; itens: Lancamento[]; total: number }>();
    for (const l of saidas) {
      const cat = categorias?.find(c => c.id === l.categoria_id);
      const key = cat?.id || 'sem-cat';
      const nome = cat?.nome || 'Sem categoria';
      if (!m.has(key)) m.set(key, { nome, itens: [], total: 0 });
      const g = m.get(key)!;
      g.itens.push(l);
      g.total += Number(l.valor_realizado || 0);
    }
    return Array.from(m.entries()).sort((a, b) => a[1].nome.localeCompare(b[1].nome));
  }, [saidas, categorias]);

  const origemNome = (id: string | null) => origens?.find(o => o.id === id)?.nome || '';

  const onEdit = (l: Lancamento) => {
    setEditing(l);
    if (l.tipo === 'entrada') setOpenEntrada(true); else setOpenSaida(true);
  };

  const onDuplicate = (l: Lancamento) => {
    setEditing(null);
    setDuplicating(l);
    if (l.tipo === 'entrada') setOpenEntrada(true); else setOpenSaida(true);
  };

  const onDelete = async (l: Lancamento) => {
    if (l.recorrencia_id) {
      setDeletingRec(l);
      return;
    }
    if (!confirm('Excluir este lançamento?')) return;
    const { error } = await supabase.from('financeiro_lancamentos').delete().eq('id', l.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ['fin'] });
    toast.success('Lançamento excluído');
  };

  const renderLine = (l: Lancamento) => (
    <div key={l.id} className="flex items-center gap-3 px-3 py-2 border-t border-border/50 hover:bg-card/50">
      <div className="text-xs text-muted-foreground w-12 shrink-0">{formatDateShort(l.data)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {(l as any).observacoes && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex shrink-0"><StickyNote className="w-3.5 h-3.5 text-primary" /></span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs whitespace-pre-wrap">{(l as any).observacoes}</TooltipContent>
            </Tooltip>
          )}
          <span className="text-sm text-foreground truncate">
            {l.descricao}
            {(l as any).parcela_total && (
              <span className="text-muted-foreground"> ({(l as any).parcela_atual} de {(l as any).parcela_total})</span>
            )}
          </span>
          {l.is_auto && (
            <Tooltip>
              <TooltipTrigger><Lock className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
              <TooltipContent>Atualizado automaticamente pelos Serviços</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {origemNome(l.origem_id) && <span className="text-xs text-muted-foreground">{origemNome(l.origem_id)}</span>}
          {l.tipo === 'saida' && <StatusPagamentoBadge status={l.status_pagamento} />}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-semibold ${l.tipo === 'entrada' ? 'text-green-400' : 'text-foreground'}`}>
          {formatCurrency(Number(l.valor_realizado || 0))}
        </div>
        {Number(l.valor_previsto || 0) !== Number(l.valor_realizado || 0) && (
          <div className="text-xs text-muted-foreground">prev. {formatCurrency(Number(l.valor_previsto || 0))}</div>
        )}
      </div>
      {!l.is_auto && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(l)}>Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(l)}>Duplicar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(l)} className="text-destructive">Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <div className="flex gap-2">
          <Button onClick={() => { setEditing(null); setOpenEntrada(true); }} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Nova Entrada
          </Button>
          <Button onClick={() => { setEditing(null); setOpenSaida(true); }} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> Nova Saída
          </Button>
        </div>
        <div className="flex-1 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar descrição..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-8 bg-card border-border" />
          </div>
          <Select value={filtroCat} onValueChange={setFiltroCat}>
            <SelectTrigger className="w-[160px] bg-card border-border"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {categorias?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[140px] bg-card border-border"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="a_pagar">A pagar</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
            <SelectTrigger className="w-[160px] bg-card border-border"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas origens</SelectItem>
              {origens?.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={filtroHoje ? 'default' : 'outline'}
            onClick={() => setFiltroHoje(v => !v)}
            className={filtroHoje ? 'bg-primary text-primary-foreground' : 'bg-card border-border'}
          >
            Hoje
          </Button>
          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={limparFiltros} className="text-muted-foreground hover:text-foreground">
              Limpar filtros
            </Button>
          )}
        </div>
      </div>


      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* ENTRADAS */}
          <button onClick={() => setOpenEntradas(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              {openEntradas ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-semibold text-foreground">ENTRADAS</span>
            </div>
            <span className="text-green-400 font-semibold">{formatCurrency(totalEntradas)}</span>
          </button>
          {openEntradas && entradas.map(renderLine)}
          {openEntradas && entradas.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhuma entrada no mês.</div>
          )}

          {/* SAÍDAS */}
          <button onClick={() => setOpenSaidas(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 border-t border-border">
            <div className="flex items-center gap-2">
              {openSaidas ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-semibold text-foreground">SAÍDAS</span>
            </div>
            <span className="text-foreground font-semibold">{formatCurrency(totalSaidas)}</span>
          </button>
          {openSaidas && saidasPorCat.map(([key, g]) => {
            const open = openCats[key] ?? true;
            return (
              <div key={key}>
                <button onClick={() => setOpenCats(s => ({ ...s, [key]: !open }))}
                  className="w-full flex items-center justify-between px-3 py-2 pl-6 bg-card hover:bg-muted/30 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span className="text-sm text-foreground">{g.nome}</span>
                  </div>
                  <span className="text-sm text-foreground">{formatCurrency(g.total)}</span>
                </button>
                {open && g.itens.map(renderLine)}
              </div>
            );
          })}
          {openSaidas && saidasPorCat.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhuma saída no mês.</div>
          )}
        </div>
      )}

      <LancamentoSaidaDialog
        open={openSaida}
        onOpenChange={v => { setOpenSaida(v); if (!v) { setEditing(null); setDuplicating(null); } }}
        edit={editing && editing.tipo === 'saida' ? editing : null}
        initial={duplicating && duplicating.tipo === 'saida' ? duplicating : null}
      />
      <LancamentoEntradaDialog
        open={openEntrada}
        onOpenChange={v => { setOpenEntrada(v); if (!v) { setEditing(null); setDuplicating(null); } }}
        edit={editing && editing.tipo === 'entrada' ? editing : null}
        initial={duplicating && duplicating.tipo === 'entrada' ? duplicating : null}
      />
      <DeleteRecurrenceDialog open={!!deletingRec} onOpenChange={v => { if (!v) setDeletingRec(null); }} lancamento={deletingRec} />
    </div>
  );
}
