import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Search, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

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

export function PneuSelectorDialog({ open, onClose, onSelect }: Props) {
  const [pneus, setPneus] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterMarca, setFilterMarca] = useState('all');
  const [filterAro, setFilterAro] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [selectedPneu, setSelectedPneu] = useState<any>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [showCadastro, setShowCadastro] = useState(false);
  const [cadastroForm, setCadastroForm] = useState({ marca: '', medida_01: '', medida_02: '', aro: '', tipo: 'Remold', quantidade: '', valor_medio_compra: '', valor_venda: '' });

  const tipos = ['Remold', 'Importado', '1ª Linha'];

  const fetchPneus = async () => {
    const { data } = await supabase.from('estoque_pneus').select('*').order('marca');
    setPneus(data || []);
  };

  useEffect(() => { if (open) fetchPneus(); }, [open]);

  const marcas = [...new Set(pneus.map(p => p.marca))];
  const aros = ['R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19'];

  const filtered = pneus.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.marca?.toLowerCase().includes(s) || `${p.medida_01}/${p.medida_02}`.includes(s);
    const matchMarca = filterMarca === 'all' || p.marca === filterMarca;
    const matchAro = filterAro === 'all' || p.aro === filterAro;
    const matchTipo = filterTipo === 'all' || p.tipo === filterTipo;
    return matchSearch && matchMarca && matchAro && matchTipo;
  });

  const handleConfirm = () => {
    if (!selectedPneu) return;
    const qty = parseInt(quantidade) || 1;
    if (qty > selectedPneu.quantidade) {
      toast.error(`Estoque insuficiente. Disponível: ${selectedPneu.quantidade}`);
      return;
    }
    onSelect({
      pneu_id: selectedPneu.id,
      quantidade: qty,
      valor_unitario: Number(selectedPneu.valor_venda),
      nome_display: `${selectedPneu.marca} ${selectedPneu.medida_01}/${selectedPneu.medida_02} ${selectedPneu.aro}`,
    });
    setSelectedPneu(null);
    setQuantidade('1');
    onClose();
  };

  const saveCadastro = async () => {
    if (!cadastroForm.marca.trim()) { toast.error('Marca obrigatória'); return; }
    await supabase.from('estoque_pneus').insert({
      marca: cadastroForm.marca,
      medida_01: cadastroForm.medida_01,
      medida_02: cadastroForm.medida_02,
      aro: cadastroForm.aro,
      tipo: cadastroForm.tipo,
      quantidade: parseInt(cadastroForm.quantidade) || 0,
      valor_medio_compra: parseFloat(cadastroForm.valor_medio_compra) || 0,
      valor_venda: parseFloat(cadastroForm.valor_venda) || 0,
    } as any);
    toast.success('Pneu cadastrado!');
    setShowCadastro(false);
    setCadastroForm({ marca: '', medida_01: '', medida_02: '', aro: '', tipo: 'Remold', quantidade: '', valor_medio_compra: '', valor_venda: '' });
    fetchPneus();
  };

  return (
    <Dialog open={open} onOpenChange={() => { setSelectedPneu(null); onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-popover border-border">
        <DialogHeader><DialogTitle>Selecionar Pneu</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por marca ou medida..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
            </div>
            <Select value={filterMarca} onValueChange={setFilterMarca}>
              <SelectTrigger className="w-full sm:w-36 bg-card border-border"><SelectValue placeholder="Marca" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterAro} onValueChange={setFilterAro}>
              <SelectTrigger className="w-full sm:w-28 bg-card border-border"><SelectValue placeholder="Aro" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {aros.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full sm:w-32 bg-card border-border"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedPneu ? (
            <div className="border border-primary/40 rounded-lg p-4 space-y-3">
              <p className="font-semibold text-foreground">{selectedPneu.marca} {selectedPneu.medida_01}/{selectedPneu.medida_02} {selectedPneu.aro}</p>
              <p className="text-sm text-muted-foreground">Estoque: {selectedPneu.quantidade} un. · Valor: {formatCurrency(Number(selectedPneu.valor_venda))} · {selectedPneu.tipo || 'Remold'}</p>
              <div className="flex items-end gap-3">
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input type="number" min="1" max={selectedPneu.quantidade} value={quantidade} onChange={e => setQuantidade(e.target.value)} className="w-24 bg-card border-border" />
                </div>
                <Button onClick={handleConfirm}>Confirmar</Button>
                <Button variant="outline" onClick={() => setSelectedPneu(null)}>Voltar</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                {filtered.map(p => (
                  <div key={p.id} onClick={() => { setSelectedPneu(p); setQuantidade('1'); }}
                    className="bg-card border border-border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">{p.medida_01}/{p.medida_02} {p.aro}</p>
                      <p className="text-sm text-muted-foreground">{p.marca} · <span className="text-xs">{p.tipo || 'Remold'}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{formatCurrency(Number(p.valor_venda))}</p>
                      <p className={`text-xs ${p.quantidade <= 2 ? 'text-primary' : 'text-muted-foreground'}`}>{p.quantidade} un.</p>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum pneu encontrado.</p>}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowCadastro(true)}>
                <Plus className="w-4 h-4 mr-1" /> Cadastrar Novo Pneu
              </Button>
            </>
          )}

          {showCadastro && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Cadastrar Novo Pneu</h4>
              <div><Label className="text-xs">Marca</Label><Input value={cadastroForm.marca} onChange={e => setCadastroForm({ ...cadastroForm, marca: e.target.value })} className="bg-card border-border" /></div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={cadastroForm.tipo} onValueChange={v => setCadastroForm({ ...cadastroForm, tipo: v })}>
                  <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Medida 01</Label><Input value={cadastroForm.medida_01} onChange={e => setCadastroForm({ ...cadastroForm, medida_01: e.target.value })} placeholder="205" className="bg-card border-border" /></div>
                <div><Label className="text-xs">Medida 02</Label><Input value={cadastroForm.medida_02} onChange={e => setCadastroForm({ ...cadastroForm, medida_02: e.target.value })} placeholder="55" className="bg-card border-border" /></div>
                <div><Label className="text-xs">Aro</Label><Input value={cadastroForm.aro} onChange={e => setCadastroForm({ ...cadastroForm, aro: e.target.value })} placeholder="R16" className="bg-card border-border" /></div>
              </div>
              <div><Label className="text-xs">Quantidade</Label><Input type="number" value={cadastroForm.quantidade} onChange={e => setCadastroForm({ ...cadastroForm, quantidade: e.target.value })} className="bg-card border-border" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Valor Compra (R$)</Label><CurrencyInput value={cadastroForm.valor_medio_compra} onChange={v => setCadastroForm({ ...cadastroForm, valor_medio_compra: v })} className="bg-card border-border" /></div>
                <div><Label className="text-xs">Valor Venda (R$)</Label><CurrencyInput value={cadastroForm.valor_venda} onChange={v => setCadastroForm({ ...cadastroForm, valor_venda: v })} className="bg-card border-border" /></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCadastro(false)}>Cancelar</Button>
                <Button size="sm" onClick={saveCadastro}>Salvar Pneu</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
