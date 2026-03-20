import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search } from 'lucide-react';
import { formatPhone } from '@/lib/format';
import { toast } from 'sonner';

export default function Fornecedores() {
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', telefone: '', endereco: '', identificacao_extrato: '', itens_fornecidos: '' });

  const fetch = async () => {
    const { data } = await supabase.from('fornecedores').select('*').order('nome');
    setList(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const save = async () => {
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return; }
    if (editId) {
      await supabase.from('fornecedores').update(form).eq('id', editId);
    } else {
      await supabase.from('fornecedores').insert(form);
    }
    toast.success('Fornecedor salvo!');
    setShowForm(false);
    setEditId(null);
    setForm({ nome: '', telefone: '', endereco: '', identificacao_extrato: '', itens_fornecidos: '' });
    fetch();
  };

  const filtered = list.filter(f => !search || f.nome?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
        <Button onClick={() => { setForm({ nome: '', telefone: '', endereco: '', identificacao_extrato: '', itens_fornecidos: '' }); setEditId(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar fornecedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
      </div>

      <div className="space-y-2">
        {filtered.map(f => (
          <div key={f.id} onClick={() => {
            setForm({ nome: f.nome, telefone: f.telefone || '', endereco: f.endereco || '', identificacao_extrato: f.identificacao_extrato || '', itens_fornecidos: f.itens_fornecidos || '' });
            setEditId(f.id); setShowForm(true);
          }} className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/40 transition-colors">
            <p className="text-foreground font-medium">{f.nome}</p>
            <p className="text-sm text-muted-foreground">{f.telefone || '—'} · {f.identificacao_extrato || '—'}</p>
            {f.itens_fornecidos && <p className="text-xs text-muted-foreground mt-1">{f.itens_fornecidos}</p>}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">Nenhum fornecedor cadastrado.</p>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-popover border-border">
          <DialogHeader><DialogTitle>{editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="bg-card border-border" /></div>
            <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: formatPhone(e.target.value) })} className="bg-card border-border" /></div>
            <div><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} className="bg-card border-border" /></div>
            <div><Label>Identificação no Extrato</Label><Input value={form.identificacao_extrato} onChange={e => setForm({ ...form, identificacao_extrato: e.target.value })} className="bg-card border-border" /></div>
            <div><Label>Itens Fornecidos</Label><Textarea value={form.itens_fornecidos} onChange={e => setForm({ ...form, itens_fornecidos: e.target.value })} placeholder="Descreva os tipos de itens fornecidos..." className="bg-card border-border" /></div>
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
