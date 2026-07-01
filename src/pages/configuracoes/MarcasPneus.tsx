import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, Circle, ArrowLeft, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Marca { id: string; nome: string; }

export default function MarcasPneus() {
  const navigate = useNavigate();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [usageCount, setUsageCount] = useState<Record<string, number>>({});
  const [newNome, setNewNome] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteState, setDeleteState] = useState<{ marca: Marca; substituto: string } | null>(null);

  const fetchAll = useCallback(async () => {
    const [mRes, ePRes] = await Promise.all([
      supabase.from('marcas_pneus').select('*').order('nome'),
      supabase.from('estoque_pneus').select('marca_id'),
    ]);
    setMarcas(mRes.data || []);
    const count: Record<string, number> = {};
    (ePRes.data || []).forEach((r: any) => {
      if (r.marca_id) count[r.marca_id] = (count[r.marca_id] || 0) + 1;
    });
    setUsageCount(count);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addMarca = async () => {
    const n = newNome.trim();
    if (!n) return;
    if (marcas.some(m => m.nome.toLowerCase() === n.toLowerCase())) { toast.error('Marca já cadastrada'); return; }
    const { error } = await supabase.from('marcas_pneus').insert({ nome: n });
    if (error) { toast.error('Erro ao cadastrar'); return; }
    setNewNome('');
    toast.success('Marca cadastrada!');
    fetchAll();
  };

  const saveEdit = async (id: string) => {
    const n = editName.trim();
    if (!n) return;
    if (marcas.some(m => m.id !== id && m.nome.toLowerCase() === n.toLowerCase())) { toast.error('Já existe marca com esse nome'); return; }
    const { error } = await supabase.from('marcas_pneus').update({ nome: n }).eq('id', id);
    if (error) { toast.error('Erro ao salvar'); return; }
    setEditId(null);
    toast.success('Marca atualizada!');
    fetchAll();
  };

  const requestDelete = (marca: Marca) => {
    setDeleteState({ marca, substituto: '' });
  };

  const confirmDelete = async () => {
    if (!deleteState) return;
    const inUse = (usageCount[deleteState.marca.id] || 0) > 0;
    if (inUse) {
      if (!deleteState.substituto) { toast.error('Selecione uma marca substituta'); return; }
      const { error: upErr } = await supabase.from('estoque_pneus')
        .update({ marca_id: deleteState.substituto }).eq('marca_id', deleteState.marca.id);
      if (upErr) { toast.error('Erro ao substituir marca'); return; }
    }
    const { error } = await supabase.from('marcas_pneus').delete().eq('id', deleteState.marca.id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Marca excluída');
    setDeleteState(null);
    fetchAll();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Circle className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Marcas de Pneus</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Gerencie o catálogo de marcas de pneus disponível no cadastro do estoque.
      </p>

      <div className="flex gap-2">
        <Input value={newNome} onChange={e => setNewNome(e.target.value)}
          placeholder="Nova marca..." className="bg-card border-border"
          onKeyDown={e => e.key === 'Enter' && addMarca()} />
        <Button onClick={addMarca}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
      </div>

      <div className="space-y-2">
        {marcas.length === 0 && <p className="text-center text-muted-foreground py-6">Nenhuma marca cadastrada.</p>}
        {marcas.map(m => {
          const count = usageCount[m.id] || 0;
          const isEditing = editId === m.id;
          return (
            <div key={m.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
              {isEditing ? (
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-background border-border h-9"
                  autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit(m.id)} />
              ) : (
                <div className="flex-1">
                  <p className="font-medium text-foreground">{m.nome}</p>
                  <p className="text-xs text-muted-foreground">{count} pneu{count !== 1 ? 's' : ''} no estoque</p>
                </div>
              )}
              <div className="flex items-center gap-1 shrink-0">
                {isEditing ? (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => saveEdit(m.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditId(m.id); setEditName(m.nome); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80"
                      onClick={() => requestDelete(m)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteState} onOpenChange={(o) => !o && setDeleteState(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir marca "{deleteState?.marca.nome}"</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteState && (usageCount[deleteState.marca.id] || 0) > 0 ? (
                <>
                  Esta marca está sendo usada em <b>{usageCount[deleteState.marca.id]}</b> pneu(s) do estoque.
                  Selecione abaixo uma marca substituta obrigatória para reatribuí-los antes de excluir.
                </>
              ) : (
                'Deseja realmente excluir esta marca?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteState && (usageCount[deleteState.marca.id] || 0) > 0 && (
            <div className="space-y-2">
              <Label>Substituir por</Label>
              <Select value={deleteState.substituto}
                onValueChange={v => setDeleteState(s => s ? { ...s, substituto: v } : s)}>
                <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Selecione uma marca..." /></SelectTrigger>
                <SelectContent>
                  {marcas.filter(x => x.id !== deleteState.marca.id).map(x => (
                    <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
