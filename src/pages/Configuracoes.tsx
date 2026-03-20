import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, X, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface Bandeira {
  id?: string;
  nome: string;
  taxas: {
    debito: string;
    credito_avista: string;
    parcelado_ranges: { de: string; ate: string; taxa: string }[];
  };
}

export default function Configuracoes() {
  const [maquininhas, setMaquininhas] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [bandeirasForm, setBandeirasForm] = useState<Bandeira[]>([]);

  const fetch = async () => {
    const { data } = await supabase.from('maquininhas').select('*, bandeiras(id, nome)').order('nome');
    setMaquininhas(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const loadMaquininha = async (id: string) => {
    const { data: m } = await supabase.from('maquininhas').select('*').eq('id', id).single();
    const { data: bands } = await supabase.from('bandeiras').select('*').eq('maquininha_id', id);
    const { data: allTaxas } = await supabase.from('taxas').select('*').in('bandeira_id', (bands || []).map(b => b.id));

    setNome(m?.nome || '');
    setEditId(id);

    const bForm: Bandeira[] = (bands || []).map(b => {
      const bTaxas = (allTaxas || []).filter(t => t.bandeira_id === b.id);
      const deb = bTaxas.find(t => t.tipo_pagamento === 'debito');
      const cav = bTaxas.find(t => t.tipo_pagamento === 'credito_avista');
      const parc = bTaxas.filter(t => t.tipo_pagamento === 'credito_parcelado');

      return {
        id: b.id,
        nome: b.nome,
        taxas: {
          debito: deb ? String(deb.percentual) : '',
          credito_avista: cav ? String(cav.percentual) : '',
          parcelado_ranges: parc.length ? parc.map(p => ({ de: String(p.parcelas_de), ate: String(p.parcelas_ate), taxa: String(p.percentual) })) : [{ de: '2', ate: '6', taxa: '' }],
        },
      };
    });
    setBandeirasForm(bForm.length ? bForm : [{ nome: '', taxas: { debito: '', credito_avista: '', parcelado_ranges: [{ de: '2', ate: '6', taxa: '' }] } }]);
    setShowForm(true);
  };

  const save = async () => {
    if (!nome.trim()) { toast.error('Nome obrigatório'); return; }

    let maqId = editId;
    if (editId) {
      await supabase.from('maquininhas').update({ nome }).eq('id', editId);
      // Delete old bandeiras (cascade deletes taxas)
      await supabase.from('bandeiras').delete().eq('maquininha_id', editId);
    } else {
      const { data } = await supabase.from('maquininhas').insert({ nome }).select().single();
      maqId = data?.id;
    }

    if (!maqId) return;

    for (const b of bandeirasForm) {
      if (!b.nome.trim()) continue;
      const { data: band } = await supabase.from('bandeiras').insert({ maquininha_id: maqId, nome: b.nome }).select().single();
      if (!band) continue;

      const taxasToInsert: any[] = [];
      if (b.taxas.debito) taxasToInsert.push({ bandeira_id: band.id, tipo_pagamento: 'debito', percentual: parseFloat(b.taxas.debito) || 0 });
      if (b.taxas.credito_avista) taxasToInsert.push({ bandeira_id: band.id, tipo_pagamento: 'credito_avista', percentual: parseFloat(b.taxas.credito_avista) || 0 });
      for (const r of b.taxas.parcelado_ranges) {
        if (r.taxa) taxasToInsert.push({
          bandeira_id: band.id, tipo_pagamento: 'credito_parcelado',
          parcelas_de: parseInt(r.de) || 2, parcelas_ate: parseInt(r.ate) || 12, percentual: parseFloat(r.taxa) || 0,
        });
      }
      if (taxasToInsert.length) await supabase.from('taxas').insert(taxasToInsert);
    }

    toast.success('Maquininha salva!');
    setShowForm(false);
    setEditId(null);
    fetch();
  };

  const addBandeira = () => setBandeirasForm([...bandeirasForm, { nome: '', taxas: { debito: '', credito_avista: '', parcelado_ranges: [{ de: '2', ate: '6', taxa: '' }] } }]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Maquininhas</h2>
          <Button onClick={() => { setNome(''); setEditId(null); setBandeirasForm([{ nome: '', taxas: { debito: '', credito_avista: '', parcelado_ranges: [{ de: '2', ate: '6', taxa: '' }] } }]); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Nova Maquininha
          </Button>
        </div>

        <div className="space-y-2">
          {maquininhas.map(m => (
            <div key={m.id} onClick={() => loadMaquininha(m.id)}
              className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/40 transition-colors">
              <p className="text-foreground font-medium">{m.nome}</p>
              <p className="text-sm text-muted-foreground">{m.bandeiras?.length || 0} bandeira(s)</p>
            </div>
          ))}
          {maquininhas.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma maquininha cadastrada.</p>}
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-popover border-border">
          <DialogHeader><DialogTitle>{editId ? 'Editar Maquininha' : 'Nova Maquininha'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Cielo" className="bg-card border-border" /></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Bandeiras</Label>
                <Button size="sm" variant="ghost" onClick={addBandeira}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
              </div>

              {bandeirasForm.map((b, bi) => (
                <div key={bi} className="bg-card border border-border rounded-lg p-4 mb-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input value={b.nome} onChange={e => { const n = [...bandeirasForm]; n[bi].nome = e.target.value; setBandeirasForm(n); }}
                      placeholder="Nome da bandeira (ex: Visa)" className="bg-background border-border" />
                    {bandeirasForm.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => setBandeirasForm(bandeirasForm.filter((_, j) => j !== bi))}><X className="w-4 h-4" /></Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Débito (%)</Label><Input type="number" step="0.01" value={b.taxas.debito} onChange={e => { const n = [...bandeirasForm]; n[bi].taxas.debito = e.target.value; setBandeirasForm(n); }} className="bg-background border-border" /></div>
                    <div><Label className="text-xs">Crédito à vista (%)</Label><Input type="number" step="0.01" value={b.taxas.credito_avista} onChange={e => { const n = [...bandeirasForm]; n[bi].taxas.credito_avista = e.target.value; setBandeirasForm(n); }} className="bg-background border-border" /></div>
                  </div>
                  <div>
                    <Label className="text-xs">Crédito Parcelado</Label>
                    {b.taxas.parcelado_ranges.map((r, ri) => (
                      <div key={ri} className="flex gap-2 mt-1 items-center">
                        <Input type="number" value={r.de} onChange={e => { const n = [...bandeirasForm]; n[bi].taxas.parcelado_ranges[ri].de = e.target.value; setBandeirasForm(n); }} placeholder="De" className="bg-background border-border w-20" />
                        <span className="text-muted-foreground">a</span>
                        <Input type="number" value={r.ate} onChange={e => { const n = [...bandeirasForm]; n[bi].taxas.parcelado_ranges[ri].ate = e.target.value; setBandeirasForm(n); }} placeholder="Até" className="bg-background border-border w-20" />
                        <span className="text-muted-foreground">parcelas →</span>
                        <Input type="number" step="0.01" value={r.taxa} onChange={e => { const n = [...bandeirasForm]; n[bi].taxas.parcelado_ranges[ri].taxa = e.target.value; setBandeirasForm(n); }} placeholder="%" className="bg-background border-border w-24" />
                        {b.taxas.parcelado_ranges.length > 1 && (
                          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { const n = [...bandeirasForm]; n[bi].taxas.parcelado_ranges = n[bi].taxas.parcelado_ranges.filter((_, j) => j !== ri); setBandeirasForm(n); }}><X className="w-4 h-4" /></Button>
                        )}
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="mt-1" onClick={() => { const n = [...bandeirasForm]; n[bi].taxas.parcelado_ranges.push({ de: '', ate: '', taxa: '' }); setBandeirasForm(n); }}>
                      <Plus className="w-3 h-3 mr-1" /> Faixa
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
