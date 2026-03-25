import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  serviceId: string;
  onClose: () => void;
  onAssigned: () => void;
}

interface ClientWithCars {
  cpf: string;
  nome: string;
  carros: { placa: string; marca: string | null; modelo: string | null }[];
}

export function AssignClientDialog({ open, serviceId, onClose, onAssigned }: Props) {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<ClientWithCars[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data: cl } = await supabase.from('clientes').select('cpf, nome');
      const { data: ca } = await supabase.from('carros').select('placa, marca, modelo, cliente_cpf');
      if (cl) {
        setClients(cl.map(c => ({
          ...c,
          carros: (ca || []).filter(car => car.cliente_cpf === c.cpf),
        })));
      }
    };
    load();
    setSelected(null);
    setSearch('');
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const s = search.toLowerCase();
    return clients.filter(c =>
      c.nome.toLowerCase().includes(s) ||
      c.cpf.toLowerCase().includes(s) ||
      c.carros.some(car =>
        car.marca?.toLowerCase().includes(s) ||
        car.modelo?.toLowerCase().includes(s) ||
        car.placa?.toLowerCase().includes(s)
      )
    );
  }, [clients, search]);

  const handleAssign = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { data: svc } = await supabase.from('servicos').select('carro_marca_livre, carro_modelo_livre, carro_placa_livre').eq('id', serviceId).single();
      const client = clients.find(c => c.cpf === selected);
      if (!client || !svc) return;

      let carroPlaca: string | null = null;

      if (svc.carro_placa_livre) {
        const existingCar = client.carros.find(car => car.placa === svc.carro_placa_livre?.toUpperCase());
        if (existingCar) {
          carroPlaca = existingCar.placa;
        } else {
          const newPlaca = svc.carro_placa_livre.toUpperCase();
          await supabase.from('carros').upsert({
            placa: newPlaca,
            marca: svc.carro_marca_livre || null,
            modelo: svc.carro_modelo_livre || null,
            cliente_cpf: selected,
          }, { onConflict: 'placa' });
          carroPlaca = newPlaca;
        }
      }

      await supabase.from('servicos').update({
        cliente_cpf: selected,
        carro_placa: carroPlaca,
        is_servico_rapido: false,
        carro_marca_livre: null,
        carro_modelo_livre: null,
        carro_placa_livre: null,
      }).eq('id', serviceId);

      await supabase.from('servicos_historico').insert({
        servico_id: serviceId,
        campo: 'cliente_cpf',
        valor_anterior: null,
        valor_novo: `${client.nome} (${client.cpf})`,
      });

      toast.success('Cliente atribuído com sucesso!');
      onAssigned();
    } catch {
      toast.error('Erro ao atribuir cliente');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Atribuir Cliente ao Serviço</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF, marca, modelo ou placa"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filtered.map(c => (
              <div
                key={c.cpf}
                onClick={() => setSelected(c.cpf)}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-colors',
                  selected === c.cpf
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                <p className="font-medium text-foreground">{c.nome}</p>
                <p className="text-xs text-muted-foreground">{c.cpf}</p>
                {c.carros.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {c.carros.map(car => (
                      <p key={car.placa} className="text-xs text-muted-foreground">
                        🚗 {car.marca} {car.modelo} · {car.placa}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">Nenhum cliente encontrado.</p>
            )}
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={!selected || loading}>
              {loading ? 'Atribuindo...' : 'Atribuir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
