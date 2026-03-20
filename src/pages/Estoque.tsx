import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Plus, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Estoque() {
  const [pneus, setPneus] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterMarca, setFilterMarca] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ marca: '', medida_01: '', medida_02: '', aro: '', quantidade: '', valor_medio_compra: '', valor_venda: '' });

  const fetch = async () => {
    const { data } = await supabase.from('estoque_pneus').select('*').order('marca');
    setPneus(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const save = async () => {
    if (!form.marca.trim()) { toast.error('Marca obrigatória'); return; }
    const data = {
      marca: form.marca,
      medida_01: form.medida_01,
      medida_02: form.medida_02,
      aro: form.aro,
      quantidade: parseInt(form.quantidade) || 0,
      valor_medio_compra: parseFloat(form.valor_medio_compra) || 0,
      valor_venda: parseFloat(form.valor_venda) || 0,
    };
    if (editId) {
      await supabase.from('estoque_pneus').update(data).eq('id', editId);
    } else {
      await supabase.from('estoque_pneus').insert(data);
    }
    toast.success('Pneu salvo!');
    setShowForm(false);
    setEditId(null);
    setForm({ marca: '', medida_01: '', medida_02: '', aro: '', quantidade: '', valor_medio_compra: '', valor_venda: '' });
    fetch();
  };

  const marcas = [...new Set(pneus.map(p => p.marca))];

  const filtered = pneus.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.marca?.toLowerCase().includes(s) || `${p.medida_01}/${p.medida_02} ${p.aro}`.includes(s);
    const matchMarca = filterMarca === 'all' || p.marca === filterMarca;
    return matchSearch && matchMarca;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Estoque de Pneus</h1>
        <Button onClick={() => { setForm({ marca: '', medida_01: '', medida_02: '', aro: '', quantidade: '', valor_medio_compra: '', valor_venda: '' }); setEditId(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Inserir Pneu
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por marca ou medida..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <Select value={filterMarca} onValueChange={setFilterMarca}>
          <SelectTrigger className="w-full sm:w-48 bg-card border-border"><SelectValue placeholder="Marca" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Marcas</SelectItem>
            {marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(p => (
          <div key={p.id} onClick={() => {
            setForm({ marca: p.marca, medida_01: p.medida_01, medida_02: p.medida_02, aro: p.aro, quantidade: String(p.quantidade), valor_medio_compra: String(p.valor_medio_compra), valor_venda: String(p.valor_venda) });
            setEditId(p.id); setShowForm(true);
          }} className={cn("bg-card border rounded-lg p-4 cursor-pointer hover:border-primary/40 transition-colors",
            p.quantidade <= 2 ? "border-primary" : "border-border"
          )}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-lg font-bold text-foreground">{p.medida_01}/{p.medida_02} {p.aro}</span>
              <span className={cn("text-sm font-semibold px-2 py-0.5 rounded", p.quantidade <= 2 ? "bg-primary/20 text-primary" : "text-muted-foreground")}>{p.quantidade} un.</span>
            </div>
            <p className="text-sm text-muted-foreground">{p.marca}</p>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-muted-foreground">Compra: {formatCurrency(Number(p.valor_medio_compra))}</span>
              <span className="text-foreground font-medium">Venda: {formatCurrency(Number(p.valor_venda))}</span>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">Nenhum pneu em estoque.</p>}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-popover border-border">
          <DialogHeader><DialogTitle>{editId ? 'Editar Pneu' : 'Inserir Pneu'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Marca</Label><Input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} className="bg-card border-border" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Medida 01</Label><Input value={form.medida_01} onChange={e => setForm({ ...form, medida_01: e.target.value })} placeholder="205" className="bg-card border-border" /></div>
              <div><Label>Medida 02</Label><Input value={form.medida_02} onChange={e => setForm({ ...form, medida_02: e.target.value })} placeholder="55" className="bg-card border-border" /></div>
              <div><Label>Aro</Label><Input value={form.aro} onChange={e => setForm({ ...form, aro: e.target.value })} placeholder="R16" className="bg-card border-border" /></div>
            </div>
            <div><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} className="bg-card border-border" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor Médio Compra (R$)</Label><Input type="number" step="0.01" value={form.valor_medio_compra} onChange={e => setForm({ ...form, valor_medio_compra: e.target.value })} className="bg-card border-border" /></div>
              <div><Label>Valor Venda (R$)</Label><Input type="number" step="0.01" value={form.valor_venda} onChange={e => setForm({ ...form, valor_venda: e.target.value })} className="bg-card border-border" /></div>
            </div>
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
