import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Plus, Search, Pencil, History, Minus, Package, Trash2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MarcaPneuCombobox, MarcaPneu } from '@/components/estoque/MarcaPneuCombobox';
import { FornecedorCombobox, Fornecedor } from '@/components/estoque/FornecedorCombobox';

const TIPOS = ['Remold', 'Importado', '1ª Linha'];
const AROS = ['R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24'];
const PAGE_SIZE = 30;

interface Pneu {
  id: string;
  marca_id: string | null;
  marca: string;
  medida_01: string;
  medida_02: string;
  aro: string;
  tipo: string | null;
  quantidade: number;
  valor_medio_compra: number;
}

const todayISO = () => format(new Date(), 'yyyy-MM-dd');

export default function Estoque() {
  const [pneus, setPneus] = useState<Pneu[]>([]);
  const [marcas, setMarcas] = useState<MarcaPneu[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterAro, setFilterAro] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterMarca, setFilterMarca] = useState('all');
  const [page, setPage] = useState(0);

  const [showCadastro, setShowCadastro] = useState(false);
  const [addStockPneu, setAddStockPneu] = useState<Pneu | null>(null);
  const [editPneu, setEditPneu] = useState<Pneu | null>(null);
  const [historyPneu, setHistoryPneu] = useState<Pneu | null>(null);
  const [deletePneu, setDeletePneu] = useState<{ pneu: Pneu; historyCount: number | null } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pRes, mRes, fRes] = await Promise.all([
      supabase.from('estoque_pneus').select('*'),
      supabase.from('marcas_pneus').select('*').order('nome'),
      supabase.from('fornecedores').select('id, nome').order('nome'),
    ]);
    const marcasList = (mRes.data || []) as MarcaPneu[];
    setMarcas(marcasList);
    const marcaById = new Map(marcasList.map(m => [m.id, m.nome]));
    const rows: Pneu[] = (pRes.data || []).map((r: any) => ({
      id: r.id,
      marca_id: r.marca_id,
      marca: r.marca_id ? (marcaById.get(r.marca_id) || r.marca || '—') : (r.marca || '—'),
      medida_01: r.medida_01 || '',
      medida_02: r.medida_02 || '',
      aro: r.aro || '',
      tipo: r.tipo || 'Remold',
      quantidade: Number(r.quantidade) || 0,
      valor_medio_compra: Number(r.valor_medio_compra) || 0,
    }));
    rows.sort((a, b) => b.quantidade - a.quantidade || a.marca.localeCompare(b.marca));
    setPneus(rows);
    setFornecedores((fRes.data || []) as Fornecedor[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(0); }, [search, filterAro, filterTipo, filterMarca]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return pneus.filter(p => {
      const matchSearch = !s
        || p.marca.toLowerCase().includes(s)
        || `${p.medida_01}/${p.medida_02} ${p.aro}`.toLowerCase().includes(s);
      const matchAro = filterAro === 'all' || p.aro === filterAro;
      const matchTipo = filterTipo === 'all' || p.tipo === filterTipo;
      const matchMarca = filterMarca === 'all' || p.marca_id === filterMarca;
      return matchSearch && matchAro && matchTipo && matchMarca;
    });
  }, [pneus, search, filterAro, filterTipo, filterMarca]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
      </div>

      <Tabs defaultValue="pneus" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="pneus" className="flex-1 sm:flex-none">Pneus</TabsTrigger>
          <TabsTrigger value="acessorios" className="flex-1 sm:flex-none">Acessórios</TabsTrigger>
        </TabsList>

        <TabsContent value="pneus" className="space-y-4 mt-4">
          {/* Filtros — linha 1: busca + botão cadastrar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por marca ou medida..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-card border-border" />
            </div>
            <Button onClick={() => setShowCadastro(true)} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" /> Cadastrar Pneu
            </Button>
          </div>

          {/* Filtros — linha 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={filterAro} onValueChange={setFilterAro}>
              <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Aro" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Aros</SelectItem>
                {AROS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMarca} onValueChange={setFilterMarca}>
              <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Marca" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Marcas</SelectItem>
                {marcas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {loading && <p className="text-center text-muted-foreground py-8">Carregando...</p>}
            {!loading && pageRows.map(p => (
              <PneuCard key={p.id} pneu={p}
                onAddStock={() => setAddStockPneu(p)}
                onEdit={() => setEditPneu(p)}
                onHistory={() => setHistoryPneu(p)} />
            ))}
            {!loading && filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Nenhum pneu encontrado.</p>
            )}
          </div>

          {/* Paginação */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>
                Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
              </span>
              {totalPages > 1 && (
                <Pagination className="mx-0 justify-end w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={(e) => { e.preventDefault(); setPage(p => Math.max(0, p - 1)); }}
                        className={cn('cursor-pointer', page === 0 && 'pointer-events-none opacity-50')} />
                    </PaginationItem>
                    <PaginationItem><PaginationLink isActive>{page + 1} / {totalPages}</PaginationLink></PaginationItem>
                    <PaginationItem>
                      <PaginationNext onClick={(e) => { e.preventDefault(); setPage(p => Math.min(totalPages - 1, p + 1)); }}
                        className={cn('cursor-pointer', page >= totalPages - 1 && 'pointer-events-none opacity-50')} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="acessorios" className="mt-4">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Acessórios</h3>
            <p className="text-muted-foreground">Em breve.</p>
          </div>
        </TabsContent>
      </Tabs>

      {showCadastro && (
        <CadastroPneuDialog
          open={showCadastro}
          onClose={() => setShowCadastro(false)}
          marcas={marcas}
          setMarcas={setMarcas}
          fornecedores={fornecedores}
          existingPneus={pneus}
          onSaved={fetchAll}
        />
      )}
      {addStockPneu && (
        <AddStockDialog open={!!addStockPneu} onClose={() => setAddStockPneu(null)}
          pneu={addStockPneu} fornecedores={fornecedores} onSaved={fetchAll} />
      )}
      {editPneu && (
        <EditPneuDialog open={!!editPneu} onClose={() => setEditPneu(null)}
          pneu={editPneu} marcas={marcas} setMarcas={setMarcas} onSaved={fetchAll} />
      )}
      {historyPneu && (
        <HistoryDialog open={!!historyPneu} onClose={() => setHistoryPneu(null)} pneu={historyPneu} />
      )}
    </div>
  );
}

/* ---------------- Pneu Card ---------------- */

function PneuCard({ pneu, onAddStock, onEdit, onHistory }: {
  pneu: Pneu;
  onAddStock: () => void;
  onEdit: () => void;
  onHistory: () => void;
}) {
  const qty = pneu.quantidade;
  const badge = qty === 0
    ? 'bg-muted text-muted-foreground'
    : qty <= 3
      ? 'bg-orange-500/20 text-orange-500'
      : 'bg-emerald-500/20 text-emerald-500';

  return (
    <div className="bg-card border border-border rounded-lg p-3 sm:p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-foreground">
            {pneu.medida_01}/{pneu.medida_02} {pneu.aro}
          </span>
          <span className={cn('text-sm font-bold px-2 py-0.5 rounded', badge)}>
            {qty} un.
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground">{pneu.tipo || 'Remold'}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{pneu.marca}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" title="Histórico de compras" onClick={onHistory}>
          <History className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Editar" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          onClick={onAddStock}
          className="bg-emerald-600 hover:bg-emerald-600/90 text-white h-8"
        >
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Cadastrar Pneu ---------------- */

function CadastroPneuDialog({ open, onClose, marcas, setMarcas, fornecedores, existingPneus, onSaved }: {
  open: boolean;
  onClose: () => void;
  marcas: MarcaPneu[];
  setMarcas: React.Dispatch<React.SetStateAction<MarcaPneu[]>>;
  fornecedores: Fornecedor[];
  existingPneus: Pneu[];
  onSaved: () => void;
}) {
  const [dataCompra, setDataCompra] = useState(todayISO());
  const [marcaId, setMarcaId] = useState<string | null>(null);
  const [tipo, setTipo] = useState('Remold');
  const [medida01, setMedida01] = useState('');
  const [medida02, setMedida02] = useState('');
  const [aro, setAro] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnit, setValorUnit] = useState('0');
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Pneu | null>(null);
  const [saving, setSaving] = useState(false);

  const marcaSelecionada = marcas.find(m => m.id === marcaId);

  const validate = () => {
    if (!dataCompra) return 'Informe a data da compra';
    if (!marcaId) return 'Selecione a marca';
    if (!/^\d+$/.test(medida01)) return 'Medida 01 deve conter apenas números';
    if (!/^\d+$/.test(medida02)) return 'Medida 02 deve conter apenas números';
    if (!aro) return 'Selecione o aro';
    if (quantidade < 1) return 'Quantidade deve ser ≥ 1';
    return null;
  };

  const handleSalvar = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }

    // Duplicidade
    const existing = existingPneus.find(p =>
      p.marca_id === marcaId
      && p.medida_01 === medida01
      && p.medida_02 === medida02
      && p.aro === aro
    );
    if (existing) { setDuplicate(existing); return; }

    await realmenteSalvar();
  };

  const realmenteSalvar = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('estoque_pneus').insert({
      marca: marcaSelecionada?.nome || '',
      marca_id: marcaId,
      medida_01: medida01,
      medida_02: medida02,
      aro,
      tipo,
      quantidade,
      valor_medio_compra: parseFloat(valorUnit) || 0,
      valor_venda: 0,
    } as any).select().single();
    if (error || !data) { setSaving(false); toast.error('Erro ao cadastrar pneu'); return; }
    await supabase.from('estoque_pneus_compras').insert({
      pneu_id: (data as any).id,
      data_compra: dataCompra,
      quantidade,
      valor_unitario: parseFloat(valorUnit) || 0,
      fornecedor_id: fornecedorId,
    });
    setSaving(false);
    toast.success('Pneu cadastrado!');
    onSaved();
    onClose();
  };

  const addCompraNoExistente = async () => {
    if (!duplicate) return;
    setSaving(true);
    await supabase.from('estoque_pneus_compras').insert({
      pneu_id: duplicate.id,
      data_compra: dataCompra,
      quantidade,
      valor_unitario: parseFloat(valorUnit) || 0,
      fornecedor_id: fornecedorId,
    });
    await supabase.from('estoque_pneus').update({
      quantidade: duplicate.quantidade + quantidade,
    }).eq('id', duplicate.id);
    setSaving(false);
    toast.success('Compra registrada no pneu existente!');
    setDuplicate(null);
    onSaved();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-popover border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Cadastrar Pneu</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data da compra</Label>
              <Input type="date" value={dataCompra} onChange={e => setDataCompra(e.target.value)} className="bg-card border-border" />
            </div>
            <div>
              <Label>Marca</Label>
              <MarcaPneuCombobox marcas={marcas} value={marcaId} onChange={setMarcaId}
                onCreated={(m) => setMarcas(prev => [...prev, m].sort((a, b) => a.nome.localeCompare(b.nome)))} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Medida 01</Label>
                <Input inputMode="numeric" value={medida01}
                  onChange={e => setMedida01(e.target.value.replace(/\D/g, ''))}
                  placeholder="205" className="bg-card border-border" />
              </div>
              <div>
                <Label>Medida 02</Label>
                <Input inputMode="numeric" value={medida02}
                  onChange={e => setMedida02(e.target.value.replace(/\D/g, ''))}
                  placeholder="55" className="bg-card border-border" />
              </div>
              <div>
                <Label>Aro</Label>
                <Select value={aro} onValueChange={setAro}>
                  <SelectTrigger className="bg-card border-border"><SelectValue placeholder="R__" /></SelectTrigger>
                  <SelectContent>{AROS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade</Label>
                <QuantityStepper value={quantidade} onChange={setQuantidade} />
              </div>
              <div>
                <Label>Valor Unitário de Compra</Label>
                <CurrencyInput value={valorUnit} onChange={setValorUnit} className="bg-card border-border" />
              </div>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <FornecedorCombobox fornecedores={fornecedores} value={fornecedorId} onChange={setFornecedorId} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSalvar} disabled={saving}>{saving ? 'Salvando...' : 'Adicionar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!duplicate} onOpenChange={(o) => !o && setDuplicate(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Pneu já cadastrado</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um pneu <b>{duplicate?.marca} {duplicate?.medida_01}/{duplicate?.medida_02} {duplicate?.aro}</b> no
              estoque (atualmente com {duplicate?.quantidade} un.). Deseja adicionar um novo registro de compra a esse pneu?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={addCompraNoExistente}>Sim, registrar compra</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ---------------- Adicionar Estoque ---------------- */

function AddStockDialog({ open, onClose, pneu, fornecedores, onSaved }: {
  open: boolean; onClose: () => void; pneu: Pneu; fornecedores: Fornecedor[]; onSaved: () => void;
}) {
  const [dataCompra, setDataCompra] = useState(todayISO());
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnit, setValorUnit] = useState(String(pneu.valor_medio_compra || 0));
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (quantidade < 1) { toast.error('Quantidade inválida'); return; }
    setSaving(true);
    const { error } = await supabase.from('estoque_pneus_compras').insert({
      pneu_id: pneu.id,
      data_compra: dataCompra,
      quantidade,
      valor_unitario: parseFloat(valorUnit) || 0,
      fornecedor_id: fornecedorId,
    });
    if (error) { setSaving(false); toast.error('Erro ao registrar'); return; }
    await supabase.from('estoque_pneus').update({ quantidade: pneu.quantidade + quantidade }).eq('id', pneu.id);
    setSaving(false);
    toast.success('Estoque atualizado!');
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Estoque</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {pneu.marca} · {pneu.medida_01}/{pneu.medida_02} {pneu.aro}
          </p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Data</Label>
            <Input type="date" value={dataCompra} onChange={e => setDataCompra(e.target.value)} className="bg-card border-border" />
          </div>
          <div>
            <Label>Quantidade</Label>
            <QuantityStepper value={quantidade} onChange={setQuantidade} />
          </div>
          <div>
            <Label>Valor Unitário de Compra</Label>
            <CurrencyInput value={valorUnit} onChange={setValorUnit} className="bg-card border-border" />
          </div>
          <div>
            <Label>Fornecedor</Label>
            <FornecedorCombobox fornecedores={fornecedores} value={fornecedorId} onChange={setFornecedorId} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Adicionar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Editar Pneu ---------------- */

function EditPneuDialog({ open, onClose, pneu, marcas, setMarcas, onSaved }: {
  open: boolean; onClose: () => void; pneu: Pneu;
  marcas: MarcaPneu[];
  setMarcas: React.Dispatch<React.SetStateAction<MarcaPneu[]>>;
  onSaved: () => void;
}) {
  const [marcaId, setMarcaId] = useState<string | null>(pneu.marca_id);
  const [tipo, setTipo] = useState(pneu.tipo || 'Remold');
  const [medida01, setMedida01] = useState(pneu.medida_01);
  const [medida02, setMedida02] = useState(pneu.medida_02);
  const [aro, setAro] = useState(pneu.aro);
  const [quantidade, setQuantidade] = useState(pneu.quantidade);
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!marcaId) { toast.error('Selecione a marca'); return; }
    setSaving(true);
    const marca = marcas.find(m => m.id === marcaId);
    const { error } = await supabase.from('estoque_pneus').update({
      marca_id: marcaId,
      marca: marca?.nome || '',
      tipo,
      medida_01: medida01,
      medida_02: medida02,
      aro,
      quantidade,
    } as any).eq('id', pneu.id);
    setSaving(false);
    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Pneu atualizado!');
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border max-w-md">
        <DialogHeader><DialogTitle>Editar Pneu</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Marca</Label>
            <MarcaPneuCombobox marcas={marcas} value={marcaId} onChange={setMarcaId}
              onCreated={(m) => setMarcas(prev => [...prev, m].sort((a, b) => a.nome.localeCompare(b.nome)))} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Medida 01</Label>
              <Input inputMode="numeric" value={medida01}
                onChange={e => setMedida01(e.target.value.replace(/\D/g, ''))} className="bg-card border-border" />
            </div>
            <div>
              <Label>Medida 02</Label>
              <Input inputMode="numeric" value={medida02}
                onChange={e => setMedida02(e.target.value.replace(/\D/g, ''))} className="bg-card border-border" />
            </div>
            <div>
              <Label>Aro</Label>
              <Select value={aro} onValueChange={setAro}>
                <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{AROS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Estoque atual</Label>
            <QuantityStepper value={quantidade} onChange={setQuantidade} allowZero />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Histórico de Compras ---------------- */

function HistoryDialog({ open, onClose, pneu }: { open: boolean; onClose: () => void; pneu: Pneu; }) {
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('estoque_pneus_compras')
        .select('id, data_compra, quantidade, valor_unitario, fornecedor:fornecedores(nome)')
        .eq('pneu_id', pneu.id)
        .order('data_compra', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);
      setRows(data || []);
    })();
  }, [pneu.id]);

  const stats = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const vals = rows.map(r => Number(r.valor_unitario) || 0);
    const media = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { media, max: Math.max(...vals), min: Math.min(...vals) };
  }, [rows]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico de Compras</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {pneu.marca} · {pneu.medida_01}/{pneu.medida_02} {pneu.aro}
          </p>
        </DialogHeader>

        {rows === null && <p className="text-muted-foreground text-sm py-6 text-center">Carregando...</p>}
        {rows && rows.length === 0 && <p className="text-muted-foreground text-sm py-6 text-center">Sem histórico de compras.</p>}

        {rows && rows.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Média (5 últ.)" value={formatCurrency(stats!.media)} />
              <StatCard label="Maior preço" value={formatCurrency(stats!.max)} />
              <StatCard label="Menor preço" value={formatCurrency(stats!.min)} />
            </div>
            <div className="space-y-1.5">
              {rows.map(r => (
                <div key={r.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(r.data_compra + 'T00:00'), 'dd/MM/yyyy')} · {r.quantidade} un.
                    </p>
                    <p className="text-xs text-muted-foreground">{r.fornecedor?.nome || 'Sem fornecedor'}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(r.valor_unitario))}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-2 text-center">
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
      <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

/* ---------------- Quantity Stepper ---------------- */

function QuantityStepper({ value, onChange, allowZero }: { value: number; onChange: (v: number) => void; allowZero?: boolean }) {
  const min = allowZero ? 0 : 1;
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0"
        onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="w-4 h-4" />
      </Button>
      <Input type="number" min={min} value={value}
        onChange={e => onChange(Math.max(min, parseInt(e.target.value || '0') || 0))}
        className="bg-card border-border text-center h-10" />
      <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0"
        onClick={() => onChange(value + 1)}>
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
