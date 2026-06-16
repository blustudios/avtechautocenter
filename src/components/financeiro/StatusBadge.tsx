import { cn } from '@/lib/utils';

export type StatusPag = 'a_pagar' | 'agendado' | 'pago';

const map: Record<StatusPag, { label: string; cls: string }> = {
  a_pagar: { label: 'A pagar', cls: 'bg-muted text-muted-foreground border-border' },
  agendado: { label: 'Agendado', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  pago: { label: 'Pago', cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
};

export function StatusPagamentoBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const item = map[status as StatusPag];
  if (!item) return null;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs border', item.cls)}>
      {item.label}
    </span>
  );
}
