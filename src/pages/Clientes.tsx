import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, X, Car } from 'lucide-react';
import { formatCPF, formatPhone, formatPlaca } from '@/lib/format';
import { toast } from 'sonner';

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCpf, setEditCpf] = useState<string | null>(null);
  const [viewClient, setViewClient] = useState<any>(null);
  const [carros, setCarros] = useState<any[]>([]);
  const [showCarForm, setShowCarForm] = useState(false);
  const [editCar, setEditCar] = useState<any>(null);

  const [form, setForm] = useState({ cpf: '', nome: '', email: '', whatsapp: '' });
  const [carForm, setCarForm] = useState({ placa: '', marca: '', modelo: '', ano: '', cor: '' });

  const fetch = async () => {
    const { data } = await supabase.from('clientes').select('*, carros(placa)').order('nome');
    setClientes(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const loadClient = async (cpf: string) => {
    const { data: c } = await supabase.from('clientes').select('*').eq('cpf', cpf).single();
    const { data: cars } = await supabase.from('carros').select('*').eq('cliente_cpf', cpf);
    setViewClient(c);
    setCarros(cars || []);
  };

  const saveClient = async () => {
    const cpf = form.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) { toast.error('CPF inválido'); return; }
    const formatted = formatCPF(cpf);
    const data = { cpf: formatted, nome: form.nome, email: form.email, whatsapp: form.whatsapp };

    if (editCpf) {
      await supabase.from('clientes').update(data).eq('cpf', editCpf);
    } else {
      const { error } = await supabase.from('clientes').insert(data);
      if (error?.code === '23505') { toast.error('CPF já cadastrado'); return; }
    }
    toast.success(editCpf ? 'Cliente atualizado!' : 'Cliente criado!');
    setShowForm(false);
    setEditCpf(null);
    setForm({ cpf: '', nome: '', email: '', whatsapp: '' });
    fetch();
  };

  const saveCar = async () => {
    if (!viewClient) return;
    const data = {
      placa: carForm.placa.toUpperCase(),
      cliente_cpf: viewClient.cpf,
      marca: carForm.marca,
      modelo: carForm.modelo,
      ano: carForm.ano ? parseInt(carForm.ano) : null,
      cor: carForm.cor,
    };
    if (editCar) {
      await supabase.from('carros').update(data).eq('placa', editCar.placa);
    } else {
      const { error } = await supabase.from('carros').insert(data);
      if (error?.code === '23505') { toast.error('Placa já cadastrada'); return; }
    }
    toast.success('Carro salvo!');
    setShowCarForm(false);
    setEditCar(null);
    setCarForm({ placa: '', marca: '', modelo: '', ano: '', cor: '' });
    loadClient(viewClient.cpf);
  };

  const filtered = clientes.filter(c => {
    const s = search.toLowerCase();
    return !s || c.nome?.toLowerCase().includes(s) || c.cpf?.includes(s) || c.whatsapp?.includes(s);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <Button onClick={() => { setForm({ cpf: '', nome: '', email: '', whatsapp: '' }); setEditCpf(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, CPF ou WhatsApp..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
      </div>

      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c.cpf} onClick={() => loadClient(c.cpf)}
            className="bg-card border border-border rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors">
            <div>
              <p className="text-foreground font-medium">{c.nome}</p>
              <p className="text-sm text-muted-foreground">{c.cpf} · {c.whatsapp || '—'}</p>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Car className="w-4 h-4" />
              <span className="text-sm">{c.carros?.length || 0}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">Nenhum cliente encontrado.</p>}
      </div>

      {/* Client form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-popover border-border">
          <DialogHeader><DialogTitle>{editCpf ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" className="bg-card border-border" /></div>
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="bg-card border-border" /></div>
            <div><Label>E-mail</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-card border-border" /></div>
            <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" className="bg-card border-border" /></div>
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={saveClient}>Salvar</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client view dialog */}
      <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
        <DialogContent className="bg-popover border-border max-w-lg">
          <DialogHeader><DialogTitle>{viewClient?.nome}</DialogTitle></DialogHeader>
          {viewClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">CPF</span><p>{viewClient.cpf}</p></div>
                <div><span className="text-muted-foreground">WhatsApp</span><p>{viewClient.whatsapp || '—'}</p></div>
                <div><span className="text-muted-foreground">E-mail</span><p>{viewClient.email || '—'}</p></div>
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">Carros</h4>
                <Button size="sm" variant="ghost" onClick={() => { setCarForm({ placa: '', marca: '', modelo: '', ano: '', cor: '' }); setEditCar(null); setShowCarForm(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
              {carros.map(c => (
                <div key={c.placa} className="bg-card rounded-lg p-3 flex justify-between items-center cursor-pointer"
                  onClick={() => { setCarForm({ placa: c.placa, marca: c.marca || '', modelo: c.modelo || '', ano: c.ano?.toString() || '', cor: c.cor || '' }); setEditCar(c); setShowCarForm(true); }}>
                  <div>
                    <p className="text-foreground font-medium">{c.marca} {c.modelo}</p>
                    <p className="text-sm text-muted-foreground">{c.placa} · {c.ano} · {c.cor}</p>
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => {
                  setForm({ cpf: viewClient.cpf, nome: viewClient.nome, email: viewClient.email || '', whatsapp: viewClient.whatsapp || '' });
                  setEditCpf(viewClient.cpf);
                  setViewClient(null);
                  setShowForm(true);
                }}>Editar Cliente</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Car form dialog */}
      <Dialog open={showCarForm} onOpenChange={setShowCarForm}>
        <DialogContent className="bg-popover border-border">
          <DialogHeader><DialogTitle>{editCar ? 'Editar Carro' : 'Novo Carro'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Placa</Label><Input value={carForm.placa} onChange={e => setCarForm({ ...carForm, placa: formatPlaca(e.target.value) })} placeholder="ABC-1234" className="bg-card border-border" readOnly={!!editCar} /></div>
            <div><Label>Marca</Label><Input value={carForm.marca} onChange={e => setCarForm({ ...carForm, marca: e.target.value })} className="bg-card border-border" /></div>
            <div><Label>Modelo</Label><Input value={carForm.modelo} onChange={e => setCarForm({ ...carForm, modelo: e.target.value })} className="bg-card border-border" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ano</Label><Input type="number" value={carForm.ano} onChange={e => setCarForm({ ...carForm, ano: e.target.value })} className="bg-card border-border" /></div>
              <div><Label>Cor</Label><Input value={carForm.cor} onChange={e => setCarForm({ ...carForm, cor: e.target.value })} className="bg-card border-border" /></div>
            </div>
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setShowCarForm(false)}>Cancelar</Button><Button onClick={saveCar}>Salvar</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
