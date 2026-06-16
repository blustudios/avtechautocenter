import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMonth } from '@/contexts/MonthContext';
import { monthLabel, nextMonth, prevMonth } from '@/lib/financeiro/dates';

export function MonthSelector() {
  const { month, setMonth } = useMonth();
  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-2 py-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(prevMonth(month))}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{monthLabel(month)}</span>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(nextMonth(month))}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
