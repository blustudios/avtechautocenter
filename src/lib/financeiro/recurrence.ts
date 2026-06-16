import { addDays, addMonths, addYears, parseISO, isAfter, format } from 'date-fns';

export type Frequencia = 'semanal' | 'mensal' | 'anual';

export function expandRecurrence(
  startISO: string,
  endISO: string,
  freq: Frequencia,
): string[] {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const out: string[] = [];
  let cursor = start;
  let i = 0;
  while (!isAfter(cursor, end)) {
    out.push(format(cursor, 'yyyy-MM-dd'));
    i++;
    if (i > 600) break; // safety
    if (freq === 'semanal') cursor = addDays(start, i * 7);
    else if (freq === 'mensal') cursor = addMonths(start, i);
    else cursor = addYears(start, i);
  }
  return out;
}
