import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addMonths, format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/lib/format';
import { formatDateBR } from '@/lib/financeiro/dates';
import { toast } from 'sonner';
import { addMovimento, deleteMovimento, Movimento } from '@/lib/financeiro/caixaMovimentos';

const db = supabase as any;
const today = () => format(new Date(), 'yyyy-MM-dd');

export function useMovimentos(mesRef: string, enabled: boolean) {
  return useQuery({
    queryKey: ['fin', 'caixa-mov', mesRef],
    enabled,
    queryFn: async () => {
      const { data, error } = await db.from('financeiro_caixa_movimentos').select('*')
        .eq('mes_referencia', mesRef).order('data').order('created_at');
      if (error) throw error;
      return (data || []) as Movimento[];
    },
  });
}

interface BaseProps { open: boolean; onOpenChange: (o: boolean) => void; mesRef: string; }

export function DepositarDialog({ open, onOpenChange, mesRef }: BaseProps) {
  const qc = useQueryClient();
  const [valor, setValor] = useState('0');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: pendentes, isLoading } = useQuery({
    queryKey: ['fin', 'caixa-pend', mesRef],
    enabled: open,
    queryFn: async () => {
      const inicio = `${mesRef.slice(0, 7)}-01`;
      const fim = format(addMonths(new Date(`${inicio}T00:00:00`), 1), 'yyyy-MM-dd');
      const { data: pags, error } = await supabase.from('servicos_pagamentos')
        .select('id, valor, data_pagamento, servico_id, servicos!inner(status, cliente_cpf, carro_placa, carro_placa_livre, clientes(nome))')
        .eq('tipo', 'Dinheiro').eq('pago', true)
        .gte('data_pagamento', inicio).lt('data_pagamento', fim)
        .order('data_pagamento', { ascending: false });
      if (error) throw error;
      const { data: usados } = await db.from('financeiro_caixa_movimentos').select('servico_pagamento_id').not('servico_pagamento_id', 'is', null);
      const set = new Set((usados || []).map((u: any) => u.servico_pagamento_id));
      return (pags || []).filter((p: any) => !set.has(p.id));
    },
  });

  const done = () => { qc.invalidateQueries({ queryKey: ['fin'] }); };

  const depositarServico = async (p: any) => {
    setBusy(true);
    try {
      const s = p.servicos;
      await addMovimento({
        mes_referencia: mesRef, data: today(), tipo: 'deposito', valor: Number(p.valor),
        descricao: `Serviço ${p.servico_id}${s?.clientes?.nome ? ' - ' + s.clientes.nome : ''}`,
        servico_pagamento_id: p.id, servico_id: p.servico_id,
      });
      toast.success('Depósito registrado'); done();
    } catch (e: any) { toast.error(e?.message || 'Erro'); } finally { setBusy(false); }
  };

  const depositarAvulso = async () => {
    const v = parseFloat(valor) || 0;
    if (v <= 0) return toast.error('Informe o valor');
    if (!desc.trim()) return toast.error('Descrição obrigatória');
    setBusy(true);
    try {
      await addMovimento({ mes_referencia: mesRef, data: today(), tipo: 'deposito', valor: v, descricao: desc.trim(), servico_pagamento_id: null, servico_id: null });
      toast.success('Entrada registrada'); setValor('0'); setDesc(''); done(); onOpenChange(false);
    } catch (e: any) { toast.error(e?.message || 'Erro'); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Depositar em Dinheiro</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Pagamentos em dinheiro de serviços</Label>
          <div className="max-h-64 overflow-y-auto space-y-1.5 border border-border rounded-md p-2">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!isLoading && !pendentes?.length && <p className="text-sm text-muted-foreground">Nenhum pagamento em dinheiro pendente de depósito.</p>}
            {pendentes?.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-2 bg-background rounded px-2 py-1.5">
                <div className="text-sm min-w-0">
                  <div className="font-medium text-foreground truncate">{p.servico_id} {p.servicos?.clientes?.nome ? `· ${p.servicos.clientes.nome}` : ''}</div>
                  <div className="text-xs text-muted-foreground">{p.servicos?.carro_placa || p.servicos?.carro_placa_livre || ''} {formatDateBR(p.data_pagamento)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-green-400">{formatCurrency(Number(p.valor))}</span>
                  <Button size="sm" disabled={busy} onClick={() => depositarServico(p)}>Depositar</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2 border-t border-border pt-3">
          <Label>Entrada avulsa</Label>
          <CurrencyInput value={valor} onChange={setValor} />
          <Input placeholder="Descrição (obrigatória)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Button className="w-full" disabled={busy} onClick={depositarAvulso}>Registrar entrada avulsa</Button>
        </div>
        <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Fechar</Button>
      </DialogContent>
    </Dialog>
  );
}

export function SacarDialog({ open, onOpenChange, mesRef }: BaseProps) {
  const qc = useQueryClient();
  const [valor, setValor] = useState('0');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const sacar = async () => {
    const v = parseFloat(valor) || 0;
    if (v <= 0) return toast.error('Informe o valor');
    if (!desc.trim()) return toast.error('Descrição obrigatória');
    setBusy(true);
    try {
      await addMovimento({ mes_referencia: mesRef, data: today(), tipo: 'saque', valor: v, descricao: desc.trim(), servico_pagamento_id: null, servico_id: null });
      toast.success('Saque registrado'); setValor('0'); setDesc('');
      qc.invalidateQueries({ queryKey: ['fin'] }); onOpenChange(false);
    } catch (e: any) { toast.error(e?.message || 'Erro'); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Sacar Dinheiro</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Valor</Label><CurrencyInput value={valor} onChange={setValor} /></div>
          <div><Label>Descrição *</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="flex-1" disabled={busy} onClick={sacar}>Confirmar saque</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HistoricoCaixaDialog({ open, onOpenChange, mesRef, saldoAnterior }: BaseProps & { saldoAnterior: number }) {
  const qc = useQueryClient();
  const { data: movs } = useMovimentos(mesRef, open);
  const [toDelete, setToDelete] = useState<Movimento | null>(null);

  let acc = saldoAnterior;
  const rows = (movs || []).map((m) => {
    acc += (m.tipo === 'deposito' ? 1 : -1) * Number(m.valor);
    return { m, saldo: acc };
  });

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteMovimento(toDelete);
      toast.success('Registro apagado');
      qc.invalidateQueries({ queryKey: ['fin'] });
    } catch (e: any) { toast.error(e?.message || 'Erro'); }
    setToDelete(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Extrato do Dinheiro</DialogTitle></DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
          <div className="flex justify-between py-2 text-sm">
            <span className="text-muted-foreground">Saldo do mês anterior</span>
            <span className="font-semibold text-foreground">{formatCurrency(saldoAnterior)}</span>
          </div>
          {rows.map(({ m, saldo }) => (
            <div key={m.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0 text-sm">
                <div className="text-foreground truncate">{m.descricao}</div>
                <div className="text-xs text-muted-foreground">{formatDateBR(m.data)} · {m.tipo === 'deposito' ? 'Depósito' : 'Saque'} · Saldo {formatCurrency(saldo)}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-sm font-semibold ${m.tipo === 'deposito' ? 'text-green-400' : 'text-red-400'}`}>
                  {m.tipo === 'deposito' ? '+' : '−'} {formatCurrency(Number(m.valor))}
                </span>
                <Button variant="ghost" size="icon" aria-label="Apagar" onClick={() => setToDelete(m)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        {!rows.length && <p className="text-sm text-muted-foreground py-3">Nenhuma movimentação neste mês.</p>}
        </div>
        <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Fechar</Button>
        <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar registro?</AlertDialogTitle>
              <AlertDialogDescription>O valor será revertido no Dinheiro{toDelete?.servico_pagamento_id ? ' e o pagamento voltará para a lista de depósitos' : ''}.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Apagar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
