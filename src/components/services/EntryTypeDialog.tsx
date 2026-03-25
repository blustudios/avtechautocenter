import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClipboardList, Zap, Wrench } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (type: 'orcamento' | 'rapido' | 'completo') => void;
  showRapido?: boolean;
}

export function EntryTypeDialog({ open, onClose, onSelect, showRapido = true }: Props) {
  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Selecione o tipo de Entrada</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Button
            onClick={() => onSelect('orcamento')}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white justify-start gap-3 text-base"
          >
            <ClipboardList className="w-5 h-5" />
            Orçamento
          </Button>

          <div className="border-t border-border pt-4 space-y-3">
            {showRapido && (
              <Button
                variant="secondary"
                onClick={() => onSelect('rapido')}
                className="w-full h-12 justify-start gap-3 text-base"
              >
                <Zap className="w-5 h-5" />
                Novo Serviço Rápido
              </Button>
            )}
            <Button
              onClick={() => onSelect('completo')}
              className="w-full h-12 justify-start gap-3 text-base"
            >
              <Wrench className="w-5 h-5" />
              Novo Serviço Completo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
