import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Cat { id: string; nome: string; is_default: boolean; is_system: boolean; }
interface Origem { id: string; nome: string; tipo: 'entrada' | 'saida'; is_default: boolean; is_system: boolean; }

export default function ConfigFinanceiro() {
  const navigate = useNavigate();
  const [cats, setCats] = useState<Cat[]>([]);
  const [origens, setOrigens] = useState<Origem[]>([]);
  const [newCat, setNewCat] = useState('');
  const [newOrigem, setNewOrigem] = useState('');
  const [newOrigemTipo, setNewOrigemTipo] = useState<'entrada' | 'saida'>('saida');
  const [editing, setEditing] = useState<{ kind: 'cat' | 'orig'; id: string; nome: string } | null>(null);

  const load = useCallback(async () => {
    const [c, o] = await Promise.all([
      supabase.from('financeiro_categorias').select('*').order('nome'),
      supabase.from('financeiro_origens').select('*').order('nome'),
    ]);
    setCats((c.data || []) as Cat[]);
    setOrigens((o.data || []) as Origem[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addCat = async () => {
    if (!newCat.trim()) return;
    const { error } = await supabase.from('financeiro_categorias').insert({ nome: newCat.trim() });
    if (error) { toast.error(error.message); return; }
    setNewCat(''); load(); toast.success('Categoria criada');
  };

  const addOrigem = async () => {
    if (!newOrigem.trim()) return;
    const { error } = await supabase.from('financeiro_origens').insert({ nome: newOrigem.trim(), tipo: newOrigemTipo });
    if (error) { toast.error(error.message); return; }
    setNewOrigem(''); load(); toast.success('Origem criada');
  };

  const deleteCat = async (c: Cat) => {
    if (c.is_system || c.is_default) { toast.error('Categoria padrão/sistema não pode ser removida.'); return; }
    const { count } = await supabase.from('financeiro_lancamentos').select('*', { count: 'exact', head: true }).eq('categoria_id', c.id);
    if ((count || 0) > 0) { toast.error('Esta categoria está em uso e não pode ser removida.'); return; }
    if (!confirm(`Excluir categoria "${c.nome}"?`)) return;
    await supabase.from('financeiro_categorias').delete().eq('id', c.id);
    load(); toast.success('Categoria removida');
  };

  const deleteOrigem = async (o: Origem) => {
    if (o.is_system) { toast.error('Origem do sistema não pode ser removida.'); return; }
    const { count } = await supabase.from('financeiro_lancamentos').select('*', { count: 'exact', head: true }).eq('origem_id', o.id);
    if ((count || 0) > 0) { toast.error('Esta origem está em uso e não pode ser removida.'); return; }
    if (!confirm(`Excluir origem "${o.nome}"?`)) return;
    await supabase.from('financeiro_origens').delete().eq('id', o.id);
    load(); toast.success('Origem removida');
  };

  const saveEdit = async () => {
    if (!editing) return;
    const table = editing.kind === 'cat' ? 'financeiro_categorias' : 'financeiro_origens';
    const { error } = await supabase.from(table).update({ nome: editing.nome.trim() }).eq('id', editing.id);
    if (error) { toast.error(error.message); return; }
    setEditing(null); load(); toast.success('Atualizado');
  };

  const origensSaida = origens.filter(o => o.tipo === 'saida');
  const origensEntrada = origens.filter(o => o.tipo === 'entrada');

  const renderRow = (kind: 'cat' | 'orig', id: string, nome: string, locked: boolean, systemLock: boolean, onDelete: () => void) => {
    const isEditing = editing?.kind === kind && editing.id === id;
    return (
      <div key={id} className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2">
        {isEditing ? (
          <>
            <Input value={editing!.nome} onChange={e => setEditing({ ...editing!, nome: e.target.value })} className="h-8 bg-background border-border" />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}><Check className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-foreground">{nome}</span>
            {systemLock && <Badge variant="secondary" className="text-xs">Sistema</Badge>}
            {!systemLock && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ kind, id, nome })}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className={`h-7 w-7 ${locked ? 'opacity-30 cursor-not-allowed' : 'text-destructive hover:bg-destructive/10'}`}
              disabled={locked} onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <DollarSign className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Categorias de Saída</h2>
          <div className="flex gap-2">
            <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Nova categoria" className="bg-card border-border" />
            <Button onClick={addCat}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">
            {cats.map(c => renderRow('cat', c.id, c.nome, c.is_system || c.is_default, c.is_system, () => deleteCat(c)))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Origens</h2>
          <div className="flex gap-2">
            <select value={newOrigemTipo} onChange={e => setNewOrigemTipo(e.target.value as any)}
              className="bg-card border border-border rounded-md px-2 text-sm text-foreground">
              <option value="saida">Saída</option>
              <option value="entrada">Entrada</option>
            </select>
            <Input value={newOrigem} onChange={e => setNewOrigem(e.target.value)} placeholder="Nova origem" className="bg-card border-border" />
            <Button onClick={addOrigem}><Plus className="w-4 h-4" /></Button>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Origens de Saída</Label>
            <div className="space-y-2 mt-1">
              {origensSaida.map(o => renderRow('orig', o.id, o.nome, o.is_system, o.is_system, () => deleteOrigem(o)))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Origens de Entrada</Label>
            <div className="space-y-2 mt-1">
              {origensEntrada.map(o => renderRow('orig', o.id, o.nome, o.is_system, o.is_system, () => deleteOrigem(o)))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
