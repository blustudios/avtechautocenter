import { statusLabels, paymentStatusLabels } from '@/lib/format';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  orcamento: 'bg-blue-500/15 text-blue-400',
  em_progresso: 'bg-status-em-progresso-bg text-status-em-progresso',
  finalizado: 'bg-status-entregue-bg text-status-entregue',
  cancelado: 'bg-destructive/15 text-destructive',
};

const paymentStyles: Record<string, string> = {
  pago: 'bg-status-entregue-bg text-status-pago',
  pendente: 'bg-status-aguardando-bg text-status-pendente',
  pendente_parcial: 'bg-[hsl(24,95%,53%,0.15)] text-[hsl(24,95%,53%)]',
  em_atraso: 'bg-[hsl(0,84%,60%,0.15)] text-[hsl(0,84%,60%)]',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusStyles[status] || 'bg-neutral text-muted-foreground')}>
      {statusLabels[status] || status}
    </span>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', paymentStyles[status] || 'bg-neutral text-muted-foreground')}>
      {paymentStatusLabels[status] || status}
    </span>
  );
}
