import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface Bandeira {
  id?: string;
  nome: string;
  taxas: {
    debito: string;
    credito_avista: string;
    parcelado: Record<number, string>; // { 2: '3.5', 3: '4.0', ... 12: '...' }
  };
}

const PARCELAS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function Configuracoes() {
  const [maquininhas, setMaquininhas] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [taxaPixMaquina, setTaxaPixMaquina] = useState('');
  const [bandeirasForm, setBandeirasForm] = useState<Bandeira[]>([]);

  const emptyParcelado = () => PARCELAS.reduce((acc, p) => ({ ...acc, [p]: '' }), {} as Record<number, string>);

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
    setTaxaPixMaquina(m?.taxa_pix_maquina != null ? String(m.taxa_pix_maquina) : '');
    setEditId(id);

    const bForm: Bandeira[] = (bands || []).map(b => {
      const bTaxas = (allTaxas || []).filter(t => t.bandeira_id === b.id);
      const deb = bTaxas.find(t => t.tipo_pagamento === 'debito');
      const cav = bTaxas.find(t => t.tipo_pagamento === 'credito_avista');
      const parc = bTaxas.filter(t => t.tipo_pagamento === 'credito_parcelado');

      const parcelado = emptyParcelado();
      parc.forEach(p => {
        if (p.parcelas_de && p.parcelas_de === p.parcelas_ate) {
          parcelado[p.parcelas_de] = String(p.percentual);
        } else if (p.parcelas_de && p.parcelas_ate) {
          // Legacy range format — fill all parcels in range
          for (let i = p.parcelas_de; i <= p.parcelas_ate; i++) {
            if (!parcelado[i]) parcelado[i] = String(p.percentual);
          }
        }
      });

      return {
        id: b.id,
        nome: b.nome,
        taxas: {
          debito: deb ? String(deb.percentual) : '',
          credito_avista: cav ? String(cav.percentual) : '',
          parcelado,
        },
      };
    });
    setBandeirasForm(bForm.length ? bForm : [{ nome: '', taxas: { debito: '', credito_avista: '', parcelado: emptyParcelado() } }]);
    setShowForm(true);
  };

  const save = async () => {
    if (!nome.trim()) { toast.error('Nome obrigatório'); return; }

    let maqId = editId;
    if (editId) {
      // Fix: delete taxas before bandeiras to avoid FK constraint
      const { data: existingBands } = await supabase.from('bandeiras').select('id').eq('maquininha_id', editId);
      const bandIds = (existingBands || []).map(b => b.id);
      if (bandIds.length) await supabase.from('taxas').delete().in('bandeira_id', bandIds);
      await supabase.from('bandeiras').delete().eq('maquininha_id', editId);
      await supabase.from('maquininhas').update({ nome, taxa_pix_maquina: parseFloat(taxaPixMaquina) || 0 }).eq('id', editId);
    } else {
      const { data } = await supabase.from('maquininhas').insert({ nome, taxa_pix_maquina: parseFloat(taxaPixMaquina) || 0 }).select().single();
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
      
      for (const parcela of PARCELAS) {
        const taxa = b.taxas.parcelado[parcela];
        if (taxa) {
          taxasToInsert.push({
            bandeira_id: band.id, tipo_pagamento: 'credito_parcelado',
            parcelas_de: parcela, parcelas_ate: parcela, percentual: parseFloat(taxa) || 0,
          });
        }
      }
      if (taxasToInsert.length) await supabase.from('taxas').insert(taxasToInsert);
    }

    toast.success('Maquininha salva!');
    setShowForm(false);
    setEditId(null);
    fetch();
  };

  const addBandeira = () => setBandeirasForm([...bandeirasForm, { nome: '', taxas: { debito: '', credito_avista: '', parcelado: emptyParcelado() } }]);

  const updateBandeiraField = (bi: number, updater: (b: Bandeira) => Bandeira) => {
    setBandeirasForm(prev => prev.map((b, i) => i === bi ? updater({ ...b }) : b));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Maquininhas</h2>
          <Button onClick={() => { setNome(''); setTaxaPixMaquina(''); setEditId(null); setBandeirasForm([{ nome: '', taxas: { debito: '', credito_avista: '', parcelado: emptyParcelado() } }]); setShowForm(true); }}>
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

            {/* Pix Máquina tax - independent of brand */}
            <div className="bg-card border border-border rounded-lg p-4">
              <Label className="text-sm font-semibold">Taxa Pix Máquina (%)</Label>
              <Input type="number" step="0.01" value={taxaPixMaquina} onChange={e => setTaxaPixMaquina(e.target.value)} placeholder="Ex: 0.99" className="bg-background border-border mt-1" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Bandeiras</Label>
                <Button size="sm" variant="ghost" onClick={addBandeira}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
              </div>

              {bandeirasForm.map((b, bi) => (
                <div key={bi} className="bg-card border border-border rounded-lg p-4 mb-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input value={b.nome} onChange={e => updateBandeiraField(bi, bb => { bb.nome = e.target.value; return bb; })}
                      placeholder="Nome da bandeira (ex: Visa)" className="bg-background border-border" />
                    {bandeirasForm.length > 0 && (
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => setBandeirasForm(bandeirasForm.filter((_, j) => j !== bi))}><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Débito (%)</Label><Input type="number" step="0.01" value={b.taxas.debito} onChange={e => updateBandeiraField(bi, bb => { bb.taxas.debito = e.target.value; return bb; })} className="bg-background border-border" /></div>
                    <div><Label className="text-xs">Crédito à vista (%)</Label><Input type="number" step="0.01" value={b.taxas.credito_avista} onChange={e => updateBandeiraField(bi, bb => { bb.taxas.credito_avista = e.target.value; return bb; })} className="bg-background border-border" /></div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Crédito Parcelado (%)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {PARCELAS.map(p => (
                        <div key={p} className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground w-6 shrink-0">{p}x</span>
                          <Input type="number" step="0.01" value={b.taxas.parcelado[p] || ''}
                            onChange={e => updateBandeiraField(bi, bb => { bb.taxas.parcelado[p] = e.target.value; return bb; })}
                            placeholder="%" className="bg-background border-border h-8 text-xs" />
                        </div>
                      ))}
                    </div>
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
