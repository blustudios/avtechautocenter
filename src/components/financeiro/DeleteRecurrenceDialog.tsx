import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Lancamento } from '@/hooks/financeiro/useFinanceiroData';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lancamento: Lancamento | null;
}

export function DeleteRecurrenceDialog({ open, onOpenChange, lancamento }: Props) {
  const qc = useQueryClient();
  const [scope, setScope] = useState<'one' | 'forward'>('one');
  const [busy, setBusy] = useState(false);

  if (!lancamento) return null;

  const confirm = async () => {
    setBusy(true);
    try {
      if (scope === 'one' || !lancamento.recorrencia_id) {
        await supabase.from('financeiro_lancamentos').delete().eq('id', lancamento.id);
      } else {
        await supabase
          .from('financeiro_lancamentos')
          .delete()
          .eq('recorrencia_id', lancamento.recorrencia_id)
          .gte('data', lancamento.data);
      }
      qc.invalidateQueries({ queryKey: ['fin'] });
      toast.success('Lançamento(s) excluído(s)');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Excluir lançamento recorrente</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Este lançamento faz parte de uma recorrência. O que deseja excluir?
        </p>
        <RadioGroup value={scope} onValueChange={(v: any) => setScope(v)} className="space-y-2">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="one" id="one" />
            <Label htmlFor="one" className="cursor-pointer">Somente este lançamento</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="forward" id="forward" />
            <Label htmlFor="forward" className="cursor-pointer">Este e todos os seguintes</Label>
          </div>
        </RadioGroup>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm} disabled={busy} variant="destructive">Confirmar exclusão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
