import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PaymentBadge } from '@/components/StatusBadge';
import { formatCurrency } from '@/lib/format';
import { Plus, Search } from 'lucide-react';
import { ServiceDialog } from '@/components/services/ServiceDialog';
import { ServiceViewDialog } from '@/components/services/ServiceViewDialog';

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

export default function Servicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [viewService, setViewService] = useState<string | null>(null);
  const [editService, setEditService] = useState<string | null>(null);
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

  const filtered = servicos.filter(s => {
    const searchLower = search.toLowerCase();
    const matchSearch = !search || 
      s.id.toLowerCase().includes(searchLower) ||
      s.cliente?.nome?.toLowerCase().includes(searchLower) ||
      s.carro?.placa?.toLowerCase().includes(searchLower);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchPayment = paymentFilter === 'all' || s.status_pagamento === paymentFilter;
    return matchSearch && matchStatus && matchPayment;
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
            <SelectItem value="aguardando_peca">Aguardando Peça</SelectItem>
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
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
          </SelectContent>
        </Select>
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
                <div className="flex items-center gap-2 mb-1">
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
