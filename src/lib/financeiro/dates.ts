import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
  parseISO,
  isValid,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function toMesRef(d: Date): string {
  return format(startOfMonth(d), 'yyyy-MM-dd');
}

export function monthRange(d: Date): { from: string; to: string } {
  return {
    from: format(startOfMonth(d), 'yyyy-MM-dd'),
    to: format(endOfMonth(d), 'yyyy-MM-dd'),
  };
}

export function nextMonth(d: Date): Date {
  return addMonths(d, 1);
}

export function prevMonth(d: Date): Date {
  return subMonths(d, 1);
}

export function monthLabel(d: Date): string {
  const txt = format(d, "MMMM 'de' yyyy", { locale: ptBR });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function formatDateBR(value?: string | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return isValid(d) ? format(d, 'dd/MM/yyyy') : '';
}

export function formatDateShort(value?: string | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return isValid(d) ? format(d, 'dd/MM') : '';
}
