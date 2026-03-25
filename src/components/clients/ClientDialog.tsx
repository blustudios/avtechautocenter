import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { Plus, X, Car } from 'lucide-react';
import { formatCPF, formatPhone, formatPlaca, CAR_COLORS } from '@/lib/format';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaveAndService?: () => void;
  onSaveAndOrcamento?: () => void;
}

interface CarForm {
  placa: string;
  marca: string;
  modelo: string;
  ano: string;
  cor: string;
}

const emptyCar = (): CarForm => ({ placa: '', marca: '', modelo: '', ano: '', cor: '' });

export function ClientDialog({ open, onClose, onSaveAndService, onSaveAndOrcamento }: Props) {
  const [form, setForm] = useState({ cpf: '', nome: '', email: '', whatsapp: '' });
  const [carForms, setCarForms] = useState<CarForm[]>([]);
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

  const save = async (action?: 'service' | 'orcamento') => {
    const cpf = form.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) { toast.error('CPF inválido'); return; }
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return; }
    const formatted = formatCPF(cpf);
    const { error } = await supabase.from('clientes').insert({
      cpf: formatted, nome: form.nome, email: form.email, whatsapp: form.whatsapp,
    });
    if (error?.code === '23505') { toast.error('CPF já cadastrado'); return; }
    if (error) { toast.error('Erro ao salvar'); return; }

    const validCars = carForms.filter(c => c.placa.trim());
    if (validCars.length) {
      await supabase.from('carros').insert(
        validCars.map(c => ({
          placa: c.placa.toUpperCase(),
          cliente_cpf: formatted,
          marca: c.marca,
          modelo: c.modelo,
          ano: c.ano ? parseInt(c.ano) : null,
          cor: c.cor,
        }))
      );
    }
    toast.success('Cliente criado!');
    if (action === 'service' && onSaveAndService) {
      onSaveAndService();
    } else if (action === 'orcamento' && onSaveAndOrcamento) {
      onSaveAndOrcamento();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-popover border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" className="bg-card border-border" /></div>
          <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="bg-card border-border" /></div>
          <div><Label>E-mail</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-card border-border" /></div>
          <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" className="bg-card border-border" /></div>
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Car className="w-4 h-4" /> Carros</h4>
              <Button variant="ghost" size="sm" onClick={() => setCarForms([...carForms, emptyCar()])}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
            </div>
            {carForms.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum carro cadastrado.</p>}
            {carForms.map((car, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-3 mb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Carro {i + 1}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCarForms(carForms.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5" /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><Label className="text-xs">Placa</Label><Input value={car.placa} onChange={e => { const n = [...carForms]; n[i].placa = formatPlaca(e.target.value); setCarForms(n); }} placeholder="ABC-1234" className="bg-background border-border h-8 text-sm" /></div>
                  <div><Label className="text-xs">Marca</Label><AutocompleteInput value={car.marca} onChange={v => { const n = [...carForms]; n[i].marca = v; setCarForms(n); }} suggestions={marcasList.map(m => m.nome)} placeholder="Ex: Fiat" className="bg-background border-border h-8 text-sm" /></div>
                  <div><Label className="text-xs">Modelo</Label><AutocompleteInput value={car.modelo} onChange={v => { const n = [...carForms]; n[i].modelo = v; setCarForms(n); }} suggestions={(() => { const marca = marcasList.find(m => m.nome.toLowerCase() === car.marca.trim().toLowerCase()); return marca ? modelosList.filter(md => md.marca_id === marca.id).map(md => md.nome) : modelosList.map(md => md.nome); })()} placeholder="Ex: Uno" className="bg-background border-border h-8 text-sm" /></div>
                  <div><Label className="text-xs">Ano</Label><Input type="number" value={car.ano} onChange={e => { const n = [...carForms]; n[i].ano = e.target.value; setCarForms(n); }} className="bg-background border-border h-8 text-sm" /></div>
                  <div className="col-span-2">
                    <Label className="text-xs">Cor</Label>
                    <Select value={car.cor} onValueChange={v => { const n = [...carForms]; n[i].cor = v; setCarForms(n); }}>
                      <SelectTrigger className="bg-background border-border h-8 text-sm"><SelectValue placeholder="Selecione a cor" /></SelectTrigger>
                      <SelectContent>{CAR_COLORS.map(c => (<SelectItem key={c.label} value={c.label}><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border border-border shrink-0" style={{ backgroundColor: c.hex }} />{c.label}</div></SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onClose()}>Cancelar</Button>
            {onSaveAndOrcamento && (
              <Button variant="outline" onClick={() => save('orcamento')} className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10">
                <ClipboardList className="w-4 h-4 mr-1" /> Salvar + Orçamento
              </Button>
            )}
            {onSaveAndService && (
              <Button variant="outline" onClick={() => save('service')} className="border-primary/50 text-primary hover:bg-primary/10">
                Salvar + Serviço
              </Button>
            )}
            <Button onClick={() => save()}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
