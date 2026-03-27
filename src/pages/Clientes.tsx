import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, X, Car, MoreHorizontal, Pencil, Trash2, Wrench, ClipboardList, UserPlus } from 'lucide-react';
import { formatCPF, formatPhone, formatPlaca, CAR_COLORS } from '@/lib/format';
import { toast } from 'sonner';
import { ServiceDialog } from '@/components/services/ServiceDialog';
import { useNavigate } from 'react-router-dom';

interface CarForm {
  placa: string;
  marca: string;
  modelo: string;
  ano: string;
  cor: string;
  ativo: boolean;
  _isExisting?: boolean;
}

const emptyCar = (): CarForm => ({ placa: '', marca: '', modelo: '', ano: '', cor: '', ativo: true });

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCpf, setEditCpf] = useState<string | null>(null);
  const [viewClient, setViewClient] = useState<any>(null);
  const [carros, setCarros] = useState<any[]>([]);
  const [serviceForCpf, setServiceForCpf] = useState<string | null>(null);
  const [orcamentoForCpf, setOrcamentoForCpf] = useState<string | null>(null);
  const [deleteConfirmCpf, setDeleteConfirmCpf] = useState<string | null>(null);

  const [form, setForm] = useState({ cpf: '', nome: '', email: '', whatsapp: '' });
  const [carForms, setCarForms] = useState<CarForm[]>([]);
  const [originalPlacas, setOriginalPlacas] = useState<string[]>([]);
  const [pendingCarConflict, setPendingCarConflict] = useState<{ placa: string; index: number } | null>(null);
  const [pendingSaveOpenService, setPendingSaveOpenService] = useState(false);
  const [linkedServices, setLinkedServices] = useState<{ placa: string; servicos: any[] } | null>(null);
  const [marcasList, setMarcasList] = useState<{ id: string; nome: string }[]>([]);
  const [modelosList, setModelosList] = useState<{ id: string; marca_id: string; nome: string }[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('marcas_carros').select('*').order('nome'),
      supabase.from('modelos_carros').select('*').order('nome'),
    ]).then(([m, md]) => {
      setMarcasList(m.data || []);
      setModelosList(md.data || []);
    });
  }, []);

  const fetchClientes = async (searchTerm?: string) => {
    let query = supabase.from('clientes').select('*, carros(placa, marca, modelo, ativo)').order('nome');
    if (searchTerm && searchTerm.length >= 3) {
      const digits = searchTerm.replace(/\D/g, '');
      if (digits.length >= 3) {
        query = query.ilike('cpf', `%${digits}%`);
      } else {
        query = query.or(`nome.ilike.%${searchTerm}%,whatsapp.ilike.%${searchTerm}%`);
      }
    }
    query = query.limit(50);
    const { data } = await query;
    setClientes(data || []);
  };

  useEffect(() => { fetchClientes(); }, []);

  const loadClient = async (cpf: string) => {
    const { data: c } = await supabase.from('clientes').select('*').eq('cpf', cpf).single();
    const { data: cars } = await supabase.from('carros').select('*').eq('cliente_cpf', cpf);
    setViewClient(c);
    setCarros(cars || []);
  };

  const openNewClient = (prefillCpf?: string) => {
    setForm({ cpf: prefillCpf ? formatCPF(prefillCpf) : '', nome: '', email: '', whatsapp: '' });
    setCarForms([]);
    setOriginalPlacas([]);
    setEditCpf(null);
    setShowForm(true);
  };

  const openEditClient = async (cpf: string) => {
    const { data: c } = await supabase.from('clientes').select('*').eq('cpf', cpf).single();
    const { data: cars } = await supabase.from('carros').select('*').eq('cliente_cpf', cpf);
    if (c) {
      setForm({ cpf: c.cpf, nome: c.nome, email: c.email || '', whatsapp: c.whatsapp || '' });
      const carData = (cars || []).map((car: any) => ({
        placa: car.placa, marca: car.marca || '', modelo: car.modelo || '',
        ano: car.ano?.toString() || '', cor: car.cor || '', ativo: car.ativo ?? true,
        _isExisting: true,
      }));
      setCarForms(carData);
      setOriginalPlacas((cars || []).map((car: any) => car.placa));
      setEditCpf(cpf);
      setShowForm(true);
    }
  };

  const confirmDeleteClient = async () => {
    if (!deleteConfirmCpf) return;
    await supabase.from('carros').delete().eq('cliente_cpf', deleteConfirmCpf);
    await supabase.from('clientes').delete().eq('cpf', deleteConfirmCpf);
    toast.success('Cliente excluído!');
    setDeleteConfirmCpf(null);
    fetchClientes();
  };

  const handleRemoveCar = async (index: number) => {
    const car = carForms[index];
    if (car._isExisting && car.placa) {
      const { data: services } = await supabase
        .from('servicos')
        .select('id, status')
        .eq('carro_placa', car.placa.toUpperCase());
      if (services && services.length > 0) {
        setLinkedServices({ placa: car.placa, servicos: services });
        return;
      }
    }
    setCarForms(carForms.filter((_, j) => j !== index));
  };

  const saveClient = async (openService = false, openOrcamento = false) => {
    const cpf = form.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) { toast.error('CPF inválido'); return; }
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return; }
    const formatted = formatCPF(cpf);
    const data = { cpf: formatted, nome: form.nome, email: form.email, whatsapp: form.whatsapp };

    if (editCpf) {
      await supabase.from('clientes').update(data).eq('cpf', editCpf);

      const currentPlacas = carForms.filter(c => c.placa.trim()).map(c => c.placa.toUpperCase());

      const removedPlacas = originalPlacas.filter(p => !currentPlacas.includes(p));
      for (const placa of removedPlacas) {
        const { data: services } = await supabase.from('servicos').select('id').eq('carro_placa', placa).limit(1);
        if (services && services.length > 0) continue;
        await supabase.from('carros').delete().eq('placa', placa);
      }

      for (const car of carForms.filter(c => c.placa.trim())) {
        const placaUpper = car.placa.toUpperCase();
        const carData = {
          marca: car.marca, modelo: car.modelo,
          ano: car.ano ? parseInt(car.ano) : null, cor: car.cor,
          ativo: car.ativo, cliente_cpf: formatted,
        };

        if (originalPlacas.includes(placaUpper)) {
          await supabase.from('carros').update(carData).eq('placa', placaUpper);
        } else {
          const { data: existing } = await supabase.from('carros').select('placa, cliente_cpf').eq('placa', placaUpper).single();
          if (existing && existing.cliente_cpf === null) {
            setPendingCarConflict({ placa: placaUpper, index: 0 });
            setPendingSaveOpenService(openService);
            toast.success('Cliente atualizado!');
            setShowForm(false);
            setEditCpf(null);
            fetchClientes();
            return;
          }
          await supabase.from('carros').insert({ placa: placaUpper, ...carData });
        }
      }
    } else {
      const { error } = await supabase.from('clientes').insert(data);
      if (error?.code === '23505') { toast.error('CPF já cadastrado'); return; }

      const validCars = carForms.filter(c => c.placa.trim());
      for (const car of validCars) {
        const placaUpper = car.placa.toUpperCase();
        const { data: existing } = await supabase.from('carros').select('placa, cliente_cpf').eq('placa', placaUpper).single();
        if (existing && existing.cliente_cpf === null) {
          setPendingCarConflict({ placa: placaUpper, index: validCars.indexOf(car) });
          setPendingSaveOpenService(openService);
          const otherCars = validCars.filter(c => c.placa.toUpperCase() !== placaUpper);
          if (otherCars.length) {
            await supabase.from('carros').insert(
              otherCars.map(c => ({
                placa: c.placa.toUpperCase(), cliente_cpf: formatted,
                marca: c.marca, modelo: c.modelo,
                ano: c.ano ? parseInt(c.ano) : null, cor: c.cor, ativo: c.ativo,
              }))
            );
          }
          toast.success('Cliente criado!');
          setShowForm(false);
          setEditCpf(null);
          fetchClientes();
          return;
        }
      }

      if (validCars.length) {
        await supabase.from('carros').insert(
          validCars.map(c => ({
            placa: c.placa.toUpperCase(), cliente_cpf: formatted,
            marca: c.marca, modelo: c.modelo,
            ano: c.ano ? parseInt(c.ano) : null, cor: c.cor, ativo: c.ativo,
          }))
        );
      }
    }

    toast.success(editCpf ? 'Cliente atualizado!' : 'Cliente criado!');
    setShowForm(false);
    setEditCpf(null);
    fetchClientes();

    if (openService) {
      setServiceForCpf(formatted);
    } else if (openOrcamento) {
      setOrcamentoForCpf(formatted);
    }
  };

  const handleCarConflictConfirm = async () => {
    if (!pendingCarConflict) return;
    const formatted = formatCPF(form.cpf.replace(/\D/g, ''));
    await supabase.from('carros').update({ cliente_cpf: formatted }).eq('placa', pendingCarConflict.placa);
    toast.success('Carro atribuído ao cliente!');
    setPendingCarConflict(null);
    fetchClientes();
    if (pendingSaveOpenService) {
      setServiceForCpf(formatted);
      setPendingSaveOpenService(false);
    }
  };

  const handleCarConflictCancel = () => {
    setPendingCarConflict(null);
    if (pendingSaveOpenService) {
      const formatted = formatCPF(form.cpf.replace(/\D/g, ''));
      setServiceForCpf(formatted);
      setPendingSaveOpenService(false);
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { orcamento: 'Orçamento', em_progresso: 'Em Progresso', finalizado: 'Finalizado', cancelado: 'Cancelado' };
    return map[s] || s;
  };

  const filtered = clientes.filter(c => {
    const s = search.toLowerCase();
    if (!s) return true;
    const sDigits = s.replace(/\D/g, '');
    const cpfDigits = c.cpf?.replace(/\D/g, '') || '';
    return c.nome?.toLowerCase().includes(s) || (sDigits && cpfDigits.includes(sDigits)) || c.cpf?.toLowerCase().includes(s) || c.whatsapp?.includes(s);
  });

  // Check if search is an 11-digit CPF with no results
  const searchDigits = search.replace(/\D/g, '');
  const isUnmatchedCpf = searchDigits.length === 11 && filtered.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <Button onClick={() => openNewClient()}>
          <Plus className="w-4 h-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, CPF ou WhatsApp..." value={search} onChange={e => {
          const raw = e.target.value;
          const digitsOnly = raw.replace(/\D/g, '');
          // If input is purely digits, auto-format as CPF
          if (digitsOnly.length > 0 && raw.replace(/[\d.\-]/g, '').length === 0) {
            setSearch(formatCPF(digitsOnly));
          } else {
            setSearch(raw);
          }
        }} className="pl-9 bg-card border-border" />
      </div>

      {isUnmatchedCpf && (
        <Button
          variant="outline"
          className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/10"
          onClick={() => {
            openNewClient(searchDigits);
            setSearch('');
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" /> Adicionar CPF {formatCPF(searchDigits)}
        </Button>
      )}

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
                  {c.carros.filter((car: any) => car.ativo).map((car: any) => (
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
                <DropdownMenuItem onClick={e => { e.stopPropagation(); setServiceForCpf(c.cpf); }}>
                  <Wrench className="w-4 h-4 mr-2" /> Adicionar Serviço
                </DropdownMenuItem>
                <DropdownMenuItem onClick={e => { e.stopPropagation(); setOrcamentoForCpf(c.cpf); }}>
                  <ClipboardList className="w-4 h-4 mr-2" /> Adicionar Orçamento
                </DropdownMenuItem>
                <DropdownMenuItem onClick={e => { e.stopPropagation(); setDeleteConfirmCpf(c.cpf); }} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        {filtered.length === 0 && !isUnmatchedCpf && <p className="text-center text-muted-foreground py-12">Nenhum cliente encontrado.</p>}
      </div>

      {/* Client form dialog */}
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
                <div key={i} className={`bg-card border border-border rounded-lg p-3 mb-2 space-y-2 ${!car.ativo ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Carro {i + 1}</span>
                    <div className="flex items-center gap-2">
                      {car._isExisting && (
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs text-muted-foreground">{car.ativo ? 'Ativo' : 'Inativo'}</Label>
                          <Switch
                            checked={car.ativo}
                            onCheckedChange={v => { const n = [...carForms]; n[i].ativo = v; setCarForms(n); }}
                          />
                        </div>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveCar(i)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Placa</Label>
                      <Input value={car.placa} onChange={e => { const n = [...carForms]; n[i].placa = formatPlaca(e.target.value); setCarForms(n); }}
                        placeholder="ABC-1234" className="bg-background border-border h-8 text-sm" readOnly={!!car._isExisting} />
                    </div>
                    <div>
                      <Label className="text-xs">Marca</Label>
                      <AutocompleteInput value={car.marca} onChange={v => { const n = [...carForms]; n[i].marca = v; setCarForms(n); }}
                        suggestions={marcasList.map(m => m.nome)}
                        placeholder="Ex: Fiat" className="bg-background border-border h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Modelo</Label>
                      <AutocompleteInput value={car.modelo} onChange={v => { const n = [...carForms]; n[i].modelo = v; setCarForms(n); }}
                        suggestions={(() => {
                          const marca = marcasList.find(m => m.nome.toLowerCase() === car.marca.trim().toLowerCase());
                          return marca ? modelosList.filter(md => md.marca_id === marca.id).map(md => md.nome) : modelosList.map(md => md.nome);
                        })()}
                        placeholder="Ex: Uno" className="bg-background border-border h-8 text-sm" />
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

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              {!editCpf && (
                <>
                  <Button variant="outline" onClick={() => saveClient(false, true)} className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10">
                    <ClipboardList className="w-4 h-4 mr-1" /> Salvar + Orçamento
                  </Button>
                  <Button variant="outline" onClick={() => saveClient(true)} className="border-primary/50 text-primary hover:bg-primary/10">
                    Salvar + Serviço
                  </Button>
                </>
              )}
              <Button onClick={() => saveClient()}>Salvar</Button>
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
                  <div key={c.placa} className={`bg-card rounded-lg p-3 mb-2 ${!c.ativo ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-medium">{c.marca} {c.modelo}</p>
                        <p className="text-sm text-muted-foreground">{c.placa} · {c.ano} · {c.cor}</p>
                      </div>
                      {!c.ativo && <span className="text-xs bg-muted text-muted-foreground rounded px-2 py-0.5">Inativo</span>}
                    </div>
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

      {serviceForCpf && (
        <ServiceDialog
          open={!!serviceForCpf}
          defaultClienteCpf={serviceForCpf}
          onClose={() => { setServiceForCpf(null); }}
        />
      )}

      {orcamentoForCpf && (
        <ServiceDialog
          open={!!orcamentoForCpf}
          defaultClienteCpf={orcamentoForCpf}
          initialStatus="orcamento"
          onClose={() => { setOrcamentoForCpf(null); }}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirmCpf} onOpenChange={() => setDeleteConfirmCpf(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir este cliente e todos os seus carros permanentemente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Car conflict dialog */}
      <AlertDialog open={!!pendingCarConflict} onOpenChange={() => setPendingCarConflict(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Carro já cadastrado</AlertDialogTitle>
            <AlertDialogDescription>
              O carro com placa <strong>{pendingCarConflict?.placa}</strong> já está cadastrado no sistema sem um cliente vinculado. Deseja adicioná-lo a este cliente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCarConflictCancel}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleCarConflictConfirm}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Linked services dialog */}
      <Dialog open={!!linkedServices} onOpenChange={() => setLinkedServices(null)}>
        <DialogContent className="bg-popover border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Impossível excluir carro vinculado a Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              O carro <strong>{linkedServices?.placa}</strong> está vinculado aos seguintes serviços:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {linkedServices?.servicos.map(s => (
                <div
                  key={s.id}
                  className="bg-card border border-border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => {
                    setLinkedServices(null);
                    setShowForm(false);
                    navigate('/servicos');
                  }}
                >
                  <span className="text-sm font-medium text-foreground">{s.id}</span>
                  <span className="text-xs bg-muted text-muted-foreground rounded px-2 py-0.5">{statusLabel(s.status)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Você pode desativar o carro em vez de excluí-lo usando o toggle Ativo/Inativo.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
