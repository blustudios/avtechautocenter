import { useEffect, useState } from 'react';
import { useMonth } from '@/contexts/MonthContext';
import {
  useCaixa, useLancamentosManuais, useAutoLines, useCategorias, useOrigens,
} from '@/hooks/financeiro/useFinanceiroData';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { CalculatorPopover } from './CalculatorPopover';

export function TabCaixa() {
  const qc = useQueryClient();
  const { month } = useMonth();
  const { data: caixa, isLoading } = useCaixa(month);
  const { data: categorias } = useCategorias();
  const { data: origens } = useOrigens();
  const { data: manuais } = useLancamentosManuais(month);
  const { data: auto } = useAutoLines(month, categorias, origens);

  const [pj, setPj] = useState('0');
  const [dinheiro, setDinheiro] = useState('0');
  const [stone, setStone] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPj(String(caixa?.current?.saldo_conta_pj ?? 0));
    setDinheiro(String(caixa?.current?.saldo_dinheiro ?? 0));
    setStone(String(caixa?.current?.saldo_stone ?? 0));
  }, [caixa?.current]);

  const total = (parseFloat(pj) || 0) + (parseFloat(dinheiro) || 0) + (parseFloat(stone) || 0);

  const prev = caixa?.previous
    ? Number(caixa.previous.saldo_conta_pj) + Number(caixa.previous.saldo_dinheiro) + Number(caixa.previous.saldo_stone)
    : 0;

  const allLancs = [...(manuais || []), ...(auto ? [auto.entrada, auto.saida] : [])];
  const totalEntradas = allLancs.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor_realizado || 0), 0);
  const totalSaidasPagas = allLancs.filter(l => l.tipo === 'saida' && l.status_pagamento === 'pago').reduce((s, l) => s + Number(l.valor_realizado || 0), 0);
  const saldoCalculado = prev + totalEntradas - totalSaidasPagas;
  const diferenca = total - saldoCalculado;

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        mes_referencia: caixa?.mesRef!,
        saldo_conta_pj: parseFloat(pj) || 0,
        saldo_dinheiro: parseFloat(dinheiro) || 0,
        saldo_stone: parseFloat(stone) || 0,
      };
      const { error } = await supabase.from('financeiro_caixa').upsert(payload, { onConflict: 'mes_referencia' });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['fin'] });
      toast.success('Caixa atualizado');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Valores em Caixa</h2>
        <div className="space-y-3">
          <div>
            <Label>Conta Corrente PJ (Inter)</Label>
            <CurrencyInput value={pj} onChange={setPj} />
          </div>
          <div>
            <Label>Dinheiro</Label>
            <div className="flex items-center gap-2">
              <CurrencyInput value={dinheiro} onChange={setDinheiro} />
              <CalculatorPopover
                ariaLabel="Calculadora para Dinheiro"
                onApply={(n) => setDinheiro(n.toFixed(2))}
              />
            </div>
          </div>
          <div>
            <Label>Stone (Maquininha)</Label>
            <div className="flex items-center gap-2">
              <CurrencyInput value={stone} onChange={setStone} />
              <CalculatorPopover
                ariaLabel="Calculadora para Stone"
                onApply={(n) => setStone(n.toFixed(2))}
              />
            </div>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="w-full bg-primary text-primary-foreground">
          {saving ? 'Salvando...' : 'Salvar Caixa'}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Conciliação</h2>
        <div className="text-sm text-muted-foreground flex justify-between border-b border-border pb-2">
          <span>Saldo do mês anterior</span>
          <span>{formatCurrency(prev)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-foreground">Total em Caixa</span>
          <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Saldo Calculado</span>
          <span className="text-foreground">{formatCurrency(saldoCalculado)}</span>
        </div>
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="text-foreground">Diferença de Caixa</span>
          <span className={`text-lg font-bold ${Math.abs(diferenca) < 0.01 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(diferenca)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Quando a diferença é zero, seu caixa está conciliado.</p>
      </div>
    </div>
  );
}
