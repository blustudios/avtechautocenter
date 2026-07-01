import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Search, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface PneuSelection {
  pneu_id: string;
  quantidade: number;
  valor_unitario: number;
  nome_display: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (pneu: PneuSelection) => void;
}

const TIPOS = ['Remold', 'Importado', '1ª Linha'];
const AROS = ['R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24'];

export function PneuSelectorDialog({ open, onClose, onSelect }: Props) {
  const [pneus, setPneus] = useState<any[]>([]);
  const [marcas, setMarcas] = useState<{ id: string; nome: string }[]>([]);
  const [search, setSearch] = useState('');
  const [filterMarca, setFilterMarca] = useState('all');
  const [filterAro, setFilterAro] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [selectedPneu, setSelectedPneu] = useState<any>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [valorUnit, setValorUnit] = useState('0');
  const [overbookWarn, setOverbookWarn] = useState<{ requested: number; available: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [pRes, mRes] = await Promise.all([
        supabase.from('estoque_pneus').select('*').gt('quantidade', 0),
        supabase.from('marcas_pneus').select('id, nome').order('nome'),
      ]);
      const marcasList = (mRes.data || []) as any[];
      setMarcas(marcasList);
      const nameById = new Map(marcasList.map(m => [m.id, m.nome]));
      const rows = (pRes.data || []).map((p: any) => ({
        ...p,
        marca_nome: p.marca_id ? (nameById.get(p.marca_id) || p.marca || '—') : (p.marca || '—'),
      }));
      rows.sort((a, b) => (b.quantidade || 0) - (a.quantidade || 0));
      setPneus(rows);
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return pneus.filter(p => {
      const matchSearch = !s
        || p.marca_nome?.toLowerCase().includes(s)
        || `${p.medida_01}/${p.medida_02}`.includes(s);
      const matchMarca = filterMarca === 'all' || p.marca_id === filterMarca;
      const matchAro = filterAro === 'all' || p.aro === filterAro;
      const matchTipo = filterTipo === 'all' || p.tipo === filterTipo;
      return matchSearch && matchMarca && matchAro && matchTipo;
    });
  }, [pneus, search, filterMarca, filterAro, filterTipo]);

  const openSelection = (p: any) => {
    setSelectedPneu(p);
    setQuantidade('1');
    const sugerido = Number(p.valor_venda) || 0;
    setValorUnit(String(sugerido > 0 ? sugerido : (Number(p.valor_medio_compra) || 0)));
  };

  const handleConfirm = () => {
    if (!selectedPneu) return;
    const qty = parseInt(quantidade) || 0;
    if (qty < 1) return;
    if (qty > selectedPneu.quantidade) {
      setOverbookWarn({ requested: qty, available: selectedPneu.quantidade });
      return;
    }
    onSelect({
      pneu_id: selectedPneu.id,
      quantidade: qty,
      valor_unitario: parseFloat(valorUnit) || 0,
      nome_display: `${selectedPneu.marca_nome} ${selectedPneu.medida_01}/${selectedPneu.medida_02} ${selectedPneu.aro}`,
    });
    setSelectedPneu(null);
    onClose();
  };

  const closeAll = () => { setSelectedPneu(null); onClose(); };

  return (
    <>
      <Dialog open={open} onOpenChange={closeAll}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-popover border-border">
          <DialogHeader><DialogTitle>Selecionar Pneu</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por marca ou medida..." value={search}
                onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Select value={filterAro} onValueChange={setFilterAro}>
                <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Aro" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Aros</SelectItem>
                  {AROS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterMarca} onValueChange={setFilterMarca}>
                <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Marca" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Marcas</SelectItem>
                  {marcas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedPneu ? (
              <div className="border border-primary/40 rounded-lg p-4 space-y-3">
                <p className="font-semibold text-foreground">
                  {selectedPneu.marca_nome} {selectedPneu.medida_01}/{selectedPneu.medida_02} {selectedPneu.aro}
                </p>
                <p className="text-sm text-muted-foreground">
                  Estoque: {selectedPneu.quantidade} un. · {selectedPneu.tipo || 'Remold'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Quantidade</Label>
                    <Input type="number" min="1" value={quantidade}
                      onChange={e => setQuantidade(e.target.value)} className="bg-card border-border" />
                  </div>
                  <div>
                    <Label className="text-xs">Valor unitário</Label>
                    <CurrencyInput value={valorUnit} onChange={setValorUnit} className="bg-card border-border" />
                    {Number(selectedPneu.valor_venda) > 0 && (
                      <button type="button" onClick={() => setValorUnit(String(Number(selectedPneu.valor_venda)))}
                        className="text-[11px] text-muted-foreground hover:text-primary mt-1">
                        Sugerido: {formatCurrency(Number(selectedPneu.valor_venda))}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setSelectedPneu(null)}>Voltar</Button>
                  <Button onClick={handleConfirm}>Confirmar</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[45vh] overflow-y-auto">
                {filtered.map(p => {
                  const q = p.quantidade;
                  const badge = q <= 3 ? 'bg-orange-500/20 text-orange-500' : 'bg-emerald-500/20 text-emerald-500';
                  return (
                    <div key={p.id} onClick={() => openSelection(p)}
                      className="bg-card border border-border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors">
                      <div>
                        <p className="font-medium text-foreground">{p.medida_01}/{p.medida_02} {p.aro}</p>
                        <p className="text-sm text-muted-foreground">{p.marca_nome} · <span className="text-xs">{p.tipo || 'Remold'}</span></p>
                      </div>
                      <span className={cn('text-sm font-bold px-2 py-1 rounded', badge)}>{q} un.</span>
                    </div>
                  );
                })}
                {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum pneu disponível em estoque.</p>}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="outline" onClick={closeAll}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!overbookWarn} onOpenChange={(o) => !o && setOverbookWarn(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Estoque insuficiente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tentou inserir <b>{overbookWarn?.requested}</b> unidade(s), mas há apenas{' '}
              <b>{overbookWarn?.available}</b> em estoque para este pneu. Ajuste a quantidade antes de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setOverbookWarn(null)}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
