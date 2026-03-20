import { statusLabels, paymentStatusLabels } from '@/lib/format';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  a_iniciar: 'bg-neutral text-status-a-iniciar',
  em_progresso: 'bg-status-em-progresso-bg text-status-em-progresso',
  aguardando_peca: 'bg-status-aguardando-bg text-status-aguardando',
  entregue: 'bg-status-entregue-bg text-status-entregue',
};

const paymentStyles: Record<string, string> = {
  pago: 'bg-status-entregue-bg text-status-pago',
  pendente: 'bg-status-aguardando-bg text-status-pendente',
  parcial: 'bg-[#3D2010] text-status-parcial',
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
