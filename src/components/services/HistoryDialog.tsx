import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { statusLabels } from '@/lib/format';
import { format } from 'date-fns';

interface Props {
  serviceId: string;
  open: boolean;
  onClose: () => void;
}

interface HistoryEntry {
  id: string;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  alterado_em: string;
}

const fieldLabels: Record<string, string> = {
  status: 'Status',
  status_pagamento: 'Status Pagamento',
  data_entrada: 'Data de Entrada',
  data_encerramento: 'Data de Encerramento',
  valor_total: 'Valor Total',
  cliente_cpf: 'Cliente',
  servicos_itens: 'Descrição dos Serviços',
  servicos_custos: 'Custos',
  servicos_pagamentos: 'Pagamentos',
};

function formatValue(campo: string, valor: string | null): string {
  if (!valor) return '—';
  if (campo === 'status') return statusLabels[valor] || valor;
  return valor;
}

export function HistoryDialog({ serviceId, open, onClose }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!open || !serviceId) return;
    supabase
      .from('servicos_historico')
      .select('*')
      .eq('servico_id', serviceId)
      .order('alterado_em', { ascending: false })
      .then(({ data }) => setEntries((data as any) || []));
  }, [open, serviceId]);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Histórico de Alterações — {serviceId}</DialogTitle>
        </DialogHeader>
        {entries.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            Nenhuma alteração registrada ainda.
          </p>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2 border-b border-border">
              <span>Data/Hora</span>
              <span>Campo</span>
              <span>Anterior</span>
              <span>Novo</span>
            </div>
            {entries.map(e => (
              <div key={e.id} className="grid grid-cols-4 gap-2 text-sm py-2 border-b border-border last:border-0">
                <span className="text-muted-foreground text-xs">
                  {format(new Date(e.alterado_em), 'dd/MM/yy HH:mm')}
                </span>
                <span className="text-foreground text-xs font-medium">
                  {fieldLabels[e.campo] || e.campo}
                </span>
                <span className="text-muted-foreground text-xs truncate">
                  {formatValue(e.campo, e.valor_anterior)}
                </span>
                <span className="text-foreground text-xs truncate">
                  {formatValue(e.campo, e.valor_novo)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
