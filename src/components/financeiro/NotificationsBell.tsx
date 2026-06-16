import { useMemo } from 'react';
import { Bell } from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useMonth } from '@/contexts/MonthContext';
import {
  useLancamentosManuais, useCaixa, useAutoLines, useCategorias, useOrigens,
} from '@/hooks/financeiro/useFinanceiroData';
import { formatCurrency } from '@/lib/format';
import { formatDateBR } from '@/lib/financeiro/dates';
import { parseISO, isAfter, isBefore, addDays, startOfDay } from 'date-fns';

export function NotificationsBell() {
  const { month } = useMonth();
  const { data: categorias } = useCategorias();
  const { data: origens } = useOrigens();
  const { data: manuais } = useLancamentosManuais(month);
  const { data: caixa } = useCaixa(month);
  const { data: auto } = useAutoLines(month, categorias, origens);

  const today = startOfDay(new Date());
  const limit = addDays(today, 3);

  const { overdue, upcoming, cashWarning } = useMemo(() => {
    const sa = (manuais || []).filter(l => l.tipo === 'saida' && l.status_pagamento !== 'pago');
    const overdue = sa.filter(l => isBefore(parseISO(l.data), today));
    const upcoming = sa.filter(l => {
      const d = parseISO(l.data);
      return !isBefore(d, today) && !isAfter(d, limit);
    });
    const aPagar = sa.reduce((s, l) => s + (Number(l.valor_realizado) || Number(l.valor_previsto) || 0), 0);
    const totalCaixa = caixa?.current
      ? Number(caixa.current.saldo_conta_pj) + Number(caixa.current.saldo_dinheiro) + Number(caixa.current.saldo_stone)
      : 0;
    const cashWarning = aPagar > totalCaixa && aPagar > 0 ? { aPagar, totalCaixa } : null;
    return { overdue, upcoming, cashWarning };
  }, [manuais, caixa, auto]);

  const count = overdue.length + upcoming.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-popover border-border p-0 max-h-[400px] overflow-y-auto">
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Notificações</h3>
        </div>
        {count === 0 && !cashWarning && (
          <div className="p-4 text-sm text-muted-foreground text-center">Sem alertas no momento.</div>
        )}
        {overdue.map(l => (
          <div key={l.id} className="p-3 border-b border-border text-sm">
            <div className="text-red-400 font-medium">Vencido</div>
            <div className="text-foreground">{l.descricao}</div>
            <div className="text-xs text-muted-foreground">venceu em {formatDateBR(l.data)} — {formatCurrency(Number(l.valor_realizado) || Number(l.valor_previsto))}</div>
          </div>
        ))}
        {upcoming.map(l => (
          <div key={l.id} className="p-3 border-b border-border text-sm">
            <div className="text-yellow-400 font-medium">A vencer</div>
            <div className="text-foreground">{l.descricao}</div>
            <div className="text-xs text-muted-foreground">vence em {formatDateBR(l.data)} — {formatCurrency(Number(l.valor_realizado) || Number(l.valor_previsto))}</div>
          </div>
        ))}
        {cashWarning && (
          <div className="p-3 text-sm">
            <div className="text-primary font-medium">⚠️ Atenção</div>
            <div className="text-foreground text-xs">
              As contas a pagar deste mês ({formatCurrency(cashWarning.aPagar)}) superam o valor disponível em caixa ({formatCurrency(cashWarning.totalCaixa)}).
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
