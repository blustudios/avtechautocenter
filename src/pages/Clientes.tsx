import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Plus, Search, X, Car, MoreHorizontal, Pencil, Trash2, Wrench } from 'lucide-react';
import { formatCPF, formatPhone, formatPlaca, CAR_COLORS } from '@/lib/format';
import { toast } from 'sonner';
import { ServiceDialog } from '@/components/services/ServiceDialog';

interface CarForm {
  placa: string;
  marca: string;
  modelo: string;
  ano: string;
  cor: string;
}

const emptyCar = (): CarForm => ({ placa: '', marca: '', modelo: '', ano: '', cor: '' });

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCpf, setEditCpf] = useState<string | null>(null);
  const [viewClient, setViewClient] = useState<any>(null);
  const [carros, setCarros] = useState<any[]>([]);
  const [serviceForCpf, setServiceForCpf] = useState<string | null>(null);

  const [form, setForm] = useState({ cpf: '', nome: '', email: '', whatsapp: '' });
  const [carForms, setCarForms] = useState<CarForm[]>([]);

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('*, carros(placa, marca, modelo)').order('nome');
    setClientes(data || []);
  };

  useEffect(() => { fetchClientes(); }, []);

  const loadClient = async (cpf: string) => {
    const { data: c } = await supabase.from('clientes').select('*').eq('cpf', cpf).single();
    const { data: cars } = await supabase.from('carros').select('*').eq('cliente_cpf', cpf);
    setViewClient(c);
    setCarros(cars || []);
  };

  const openNewClient = () => {
    setForm({ cpf: '', nome: '', email: '', whatsapp: '' });
    setCarForms([]);
    setEditCpf(null);
    setShowForm(true);
  };

  const openEditClient = async (cpf: string) => {
    const { data: c } = await supabase.from('clientes').select('*').eq('cpf', cpf).single();
    const { data: cars } = await supabase.from('carros').select('*').eq('cliente_cpf', cpf);
    if (c) {
      setForm({ cpf: c.cpf, nome: c.nome, email: c.email || '', whatsapp: c.whatsapp || '' });
      setCarForms((cars || []).map((car: any) => ({
        placa: car.placa, marca: car.marca || '', modelo: car.modelo || '',
        ano: car.ano?.toString() || '', cor: car.cor || '',
      })));
      setEditCpf(cpf);
      setShowForm(true);
    }
  };

  const deleteClient = async (cpf: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente e todos os seus carros?')) return;
    await supabase.from('carros').delete().eq('cliente_cpf', cpf);
    await supabase.from('clientes').delete().eq('cpf', cpf);
    toast.success('Cliente excluído!');
    fetchClientes();
  };

  const saveClient = async () => {
    const cpf = form.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) { toast.error('CPF inválido'); return; }
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return; }
    const formatted = formatCPF(cpf);
    const data = { cpf: formatted, nome: form.nome, email: form.email, whatsapp: form.whatsapp };

    if (editCpf) {
      await supabase.from('clientes').update(data).eq('cpf', editCpf);
      // Delete old cars and re-insert
      await supabase.from('carros').delete().eq('cliente_cpf', editCpf);
    } else {
      const { error } = await supabase.from('clientes').insert(data);
      if (error?.code === '23505') { toast.error('CPF já cadastrado'); return; }
    }

    // Insert cars
    const validCars = carForms.filter(c => c.placa.trim());
    if (validCars.length) {
      const { error } = await supabase.from('carros').insert(
        validCars.map(c => ({
          placa: c.placa.toUpperCase(),
          cliente_cpf: formatted,
          marca: c.marca,
          modelo: c.modelo,
          ano: c.ano ? parseInt(c.ano) : null,
          cor: c.cor,
        }))
      );
      if (error) { toast.error('Erro ao salvar carros: ' + error.message); }
    }

    toast.success(editCpf ? 'Cliente atualizado!' : 'Cliente criado!');
    setShowForm(false);
    setEditCpf(null);
    fetchClientes();
  };

  const filtered = clientes.filter(c => {
    const s = search.toLowerCase();
    return !s || c.nome?.toLowerCase().includes(s) || c.cpf?.includes(s) || c.whatsapp?.includes(s);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <Button onClick={openNewClient}>
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
            className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium">{c.nome}</p>
              <p className="text-sm text-muted-foreground">{c.cpf} · {c.whatsapp || '—'}</p>
              {c.carros && c.carros.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <Car className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {c.carros.map((car: any) => (
                    <span key={car.placa} className="text-xs bg-background/50 border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                      {car.marca} {car.modelo}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={e => { e.stopPropagation(); openEditClient(c.cpf); }}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={e => { e.stopPropagation(); deleteClient(c.cpf); }} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">Nenhum cliente encontrado.</p>}
      </div>

      {/* Client form dialog with inline cars */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-popover border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editCpf ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" className="bg-card border-border" readOnly={!!editCpf} /></div>
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="bg-card border-border" /></div>
            <div><Label>E-mail</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-card border-border" /></div>
            <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" className="bg-card border-border" /></div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Car className="w-4 h-4" /> Carros
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setCarForms([...carForms, emptyCar()])}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>

              {carForms.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum carro cadastrado.</p>
              )}

              {carForms.map((car, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-3 mb-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Carro {i + 1}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCarForms(carForms.filter((_, j) => j !== i))}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Placa</Label>
                      <Input value={car.placa} onChange={e => { const n = [...carForms]; n[i].placa = formatPlaca(e.target.value); setCarForms(n); }}
                        placeholder="ABC-1234" className="bg-background border-border h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Marca</Label>
                      <Input value={car.marca} onChange={e => { const n = [...carForms]; n[i].marca = e.target.value; setCarForms(n); }}
                        className="bg-background border-border h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Modelo</Label>
                      <Input value={car.modelo} onChange={e => { const n = [...carForms]; n[i].modelo = e.target.value; setCarForms(n); }}
                        className="bg-background border-border h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Ano</Label>
                      <Input type="number" value={car.ano} onChange={e => { const n = [...carForms]; n[i].ano = e.target.value; setCarForms(n); }}
                        className="bg-background border-border h-8 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Cor</Label>
                      <Select value={car.cor} onValueChange={v => { const n = [...carForms]; n[i].cor = v; setCarForms(n); }}>
                        <SelectTrigger className="bg-background border-border h-8 text-sm">
                          <SelectValue placeholder="Selecione a cor" />
                        </SelectTrigger>
                        <SelectContent>
                          {CAR_COLORS.map(c => (
                            <SelectItem key={c.label} value={c.label}>
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full border border-border shrink-0" style={{ backgroundColor: c.hex }} />
                                {c.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={saveClient}>Salvar</Button>
            </div>
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
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <Car className="w-4 h-4" /> Carros
                </h4>
                {carros.length === 0 && <p className="text-sm text-muted-foreground">Nenhum carro cadastrado.</p>}
                {carros.map(c => (
                  <div key={c.placa} className="bg-card rounded-lg p-3 mb-2">
                    <p className="text-foreground font-medium">{c.marca} {c.modelo}</p>
                    <p className="text-sm text-muted-foreground">{c.placa} · {c.ano} · {c.cor}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setViewClient(null);
                  openEditClient(viewClient.cpf);
                }}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar Cliente
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
