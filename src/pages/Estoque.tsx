import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Estoque() {
  const [pneus, setPneus] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterMarca, setFilterMarca] = useState('all');
  const [filterAro, setFilterAro] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ marca: '', medida_01: '', medida_02: '', aro: '', tipo: 'Remold', quantidade: '', valor_medio_compra: '', valor_venda: '' });

  const tipos = ['Remold', 'Importado', '1ª Linha'];

  const fetch = async () => {
    const { data } = await supabase.from('estoque_pneus').select('*').order('marca');
    setPneus(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const save = async () => {
    if (!form.marca.trim()) { toast.error('Marca obrigatória'); return; }
    const data: any = {
      marca: form.marca,
      medida_01: form.medida_01,
      medida_02: form.medida_02,
      aro: form.aro,
      tipo: form.tipo,
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
    setForm({ marca: '', medida_01: '', medida_02: '', aro: '', tipo: 'Remold', quantidade: '', valor_medio_compra: '', valor_venda: '' });
    fetch();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('estoque_pneus').delete().eq('id', deleteId);
    toast.success('Pneu excluído!');
    setDeleteId(null);
    fetch();
  };

  const openEdit = (p: any) => {
    setForm({ marca: p.marca, medida_01: p.medida_01, medida_02: p.medida_02, aro: p.aro, tipo: p.tipo || 'Remold', quantidade: String(p.quantidade), valor_medio_compra: String(p.valor_medio_compra), valor_venda: String(p.valor_venda) });
    setEditId(p.id);
    setShowForm(true);
  };

  const marcas = [...new Set(pneus.map(p => p.marca))];
  const aros = ['R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19'];

  const filtered = pneus.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.marca?.toLowerCase().includes(s) || `${p.medida_01}/${p.medida_02} ${p.aro}`.includes(s);
    const matchMarca = filterMarca === 'all' || p.marca === filterMarca;
    const matchAro = filterAro === 'all' || p.aro === filterAro;
    const matchTipo = filterTipo === 'all' || p.tipo === filterTipo;
    return matchSearch && matchMarca && matchAro && matchTipo;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
      </div>

      <Tabs defaultValue="pneus" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="pneus" className="flex-1 sm:flex-none">Pneus</TabsTrigger>
          <TabsTrigger value="acessorios" className="flex-1 sm:flex-none">Acessórios</TabsTrigger>
        </TabsList>

        <TabsContent value="pneus" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por marca ou medida..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
            </div>
            <Select value={filterMarca} onValueChange={setFilterMarca}>
              <SelectTrigger className="w-full sm:w-40 bg-card border-border"><SelectValue placeholder="Marca" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Marcas</SelectItem>
                {marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterAro} onValueChange={setFilterAro}>
              <SelectTrigger className="w-full sm:w-32 bg-card border-border"><SelectValue placeholder="Aro" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Aros</SelectItem>
                {aros.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full sm:w-36 bg-card border-border"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => { setForm({ marca: '', medida_01: '', medida_02: '', aro: '', tipo: 'Remold', quantidade: '', valor_medio_compra: '', valor_venda: '' }); setEditId(null); setShowForm(true); }} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" /> Inserir Pneu
            </Button>
          </div>

          <div className="space-y-2">
            {filtered.map(p => (
              <div key={p.id} className={cn(
                "bg-card border rounded-lg p-3 sm:p-4 flex items-center gap-3 transition-colors",
                p.quantidade <= 2 ? "border-primary" : "border-border"
              )}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-foreground">{p.medida_01}/{p.medida_02} {p.aro}</span>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", p.quantidade <= 2 ? "bg-primary/20 text-primary" : "text-muted-foreground bg-muted")}>{p.quantidade} un.</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground">{p.tipo || 'Remold'}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.marca}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">Compra: {formatCurrency(Number(p.valor_medio_compra))}</p>
                    <p className="text-sm font-medium text-foreground">Venda: {formatCurrency(Number(p.valor_venda))}</p>
                  </div>
                  <div className="text-right sm:hidden">
                    <p className="text-sm font-medium text-foreground">{formatCurrency(Number(p.valor_venda))}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteId(p.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">Nenhum pneu em estoque.</p>}
        </TabsContent>

        <TabsContent value="acessorios" className="mt-4">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Acessórios</h3>
            <p className="text-muted-foreground">Em breve. Esta funcionalidade está sendo desenvolvida.</p>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-popover border-border">
          <DialogHeader><DialogTitle>{editId ? 'Editar Pneu' : 'Inserir Pneu'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Marca</Label><Input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} className="bg-card border-border" /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Medida 01</Label><Input value={form.medida_01} onChange={e => setForm({ ...form, medida_01: e.target.value })} placeholder="205" className="bg-card border-border" /></div>
              <div><Label>Medida 02</Label><Input value={form.medida_02} onChange={e => setForm({ ...form, medida_02: e.target.value })} placeholder="55" className="bg-card border-border" /></div>
              <div><Label>Aro</Label><Input value={form.aro} onChange={e => setForm({ ...form, aro: e.target.value })} placeholder="R16" className="bg-card border-border" /></div>
            </div>
            <div><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} className="bg-card border-border" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor Médio Compra (R$)</Label><CurrencyInput value={form.valor_medio_compra} onChange={v => setForm({ ...form, valor_medio_compra: v })} className="bg-card border-border" /></div>
              <div><Label>Valor Venda (R$)</Label><CurrencyInput value={form.valor_venda} onChange={v => setForm({ ...form, valor_venda: v })} className="bg-card border-border" /></div>
            </div>
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pneu</AlertDialogTitle>
            <AlertDialogDescription>Deseja excluir este pneu do estoque permanentemente?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
