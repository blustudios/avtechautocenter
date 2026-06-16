import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent as AlertContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader as AlertHeader, AlertDialogTitle as AlertTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, RefreshCw, ArrowLeft, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface BandeiraTaxas {
  debito: string;
  credito_avista: string;
  parcelado: Record<number, string>;
}

interface Bandeira {
  id?: string;
  nome: string;
  taxas: BandeiraTaxas;
}

const PARCELAS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const emptyParcelado = (): Record<number, string> =>
  PARCELAS.reduce((acc, p) => ({ ...acc, [p]: '' }), {} as Record<number, string>);

const emptyBandeira = (): Bandeira => ({
  nome: '',
  taxas: { debito: '', credito_avista: '', parcelado: emptyParcelado() },
});

const taxasEqual = (a: BandeiraTaxas, b: BandeiraTaxas): boolean => {
  if (a.debito !== b.debito || a.credito_avista !== b.credito_avista) return false;
  for (const p of PARCELAS) {
    if ((a.parcelado[p] || '') !== (b.parcelado[p] || '')) return false;
  }
  return true;
};

const hasDuplicateName = (bandeiras: Bandeira[], index: number): boolean => {
  const name = bandeiras[index].nome.trim().toLowerCase();
  if (!name) return false;
  return bandeiras.some((b, i) => i !== index && b.nome.trim().toLowerCase() === name);
};

export default function Maquininhas() {
  const navigate = useNavigate();
  const [maquininhas, setMaquininhas] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [taxaPixMaquina, setTaxaPixMaquina] = useState('');
  const [bandeirasForm, setBandeirasForm] = useState<Bandeira[]>([]);
  const [originalBandeiras, setOriginalBandeiras] = useState<Map<string, BandeiraTaxas>>(new Map());
  const [bandeirasEmUso, setBandeirasEmUso] = useState<Set<string>>(new Set());
  const [updateConfirm, setUpdateConfirm] = useState<{ bandeiraIndex: number } | null>(null);

  const fetchMaquininhas = useCallback(async () => {
    const { data } = await supabase.from('maquininhas').select('*, bandeiras(id, nome)').order('nome');
    setMaquininhas(data || []);
  }, []);

  useEffect(() => { fetchMaquininhas(); }, [fetchMaquininhas]);

  const toggleAtivo = async (id: string, current: boolean) => {
    const { error } = await supabase.from('maquininhas').update({ ativo: !current }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar status'); return; }
    setMaquininhas(prev => prev.map(m => m.id === id ? { ...m, ativo: !current } : m));
    toast.success(!current ? 'Maquininha ativada' : 'Maquininha desativada');
  };

  const loadMaquininha = async (id: string) => {
    const { data: m } = await supabase.from('maquininhas').select('*').eq('id', id).single();
    const { data: bands } = await supabase.from('bandeiras').select('*').eq('maquininha_id', id);
    const bandIds = (bands || []).map(b => b.id);
    const { data: allTaxas } = bandIds.length
      ? await supabase.from('taxas').select('*').in('bandeira_id', bandIds)
      : { data: [] };

    const { data: usageData } = bandIds.length
      ? await supabase.from('servicos_pagamentos').select('bandeira_id').in('bandeira_id', bandIds)
      : { data: [] };
    const usedIds = new Set((usageData || []).map((u: any) => u.bandeira_id));
    setBandeirasEmUso(usedIds);

    setNome(m?.nome || '');
    setTaxaPixMaquina(m?.taxa_pix_maquina != null ? String(m.taxa_pix_maquina) : '');
    setEditId(id);

    const origMap = new Map<string, BandeiraTaxas>();
    const bForm: Bandeira[] = (bands || []).map(b => {
      const bTaxas = (allTaxas || []).filter((t: any) => t.bandeira_id === b.id);
      const deb = bTaxas.find((t: any) => t.tipo_pagamento === 'debito');
      const cav = bTaxas.find((t: any) => t.tipo_pagamento === 'credito_avista');
      const parc = bTaxas.filter((t: any) => t.tipo_pagamento === 'credito_parcelado');
      const parcelado = emptyParcelado();
      parc.forEach((p: any) => {
        if (p.parcelas_de && p.parcelas_de === p.parcelas_ate) {
          parcelado[p.parcelas_de] = String(p.percentual);
        } else if (p.parcelas_de && p.parcelas_ate) {
          for (let i = p.parcelas_de; i <= p.parcelas_ate; i++) {
            if (!parcelado[i]) parcelado[i] = String(p.percentual);
          }
        }
      });
      const taxas: BandeiraTaxas = {
        debito: deb ? String(deb.percentual) : '',
        credito_avista: cav ? String(cav.percentual) : '',
        parcelado,
      };
      origMap.set(b.id, {
        debito: taxas.debito,
        credito_avista: taxas.credito_avista,
        parcelado: { ...taxas.parcelado },
      });
      return { id: b.id, nome: b.nome, taxas };
    });

    setOriginalBandeiras(origMap);
    setBandeirasForm(bForm.length ? bForm : [emptyBandeira()]);
    setShowForm(true);
  };

  const saveTaxasForBandeira = async (bandId: string, taxas: BandeiraTaxas) => {
    await supabase.from('taxas').delete().eq('bandeira_id', bandId);
    const toInsert: any[] = [];
    if (taxas.debito) toInsert.push({ bandeira_id: bandId, tipo_pagamento: 'debito', percentual: parseFloat(taxas.debito) || 0 });
    if (taxas.credito_avista) toInsert.push({ bandeira_id: bandId, tipo_pagamento: 'credito_avista', percentual: parseFloat(taxas.credito_avista) || 0 });
    for (const parcela of PARCELAS) {
      const taxa = taxas.parcelado[parcela];
      if (taxa) {
        toInsert.push({
          bandeira_id: bandId, tipo_pagamento: 'credito_parcelado',
          parcelas_de: parcela, parcelas_ate: parcela, percentual: parseFloat(taxa) || 0,
        });
      }
    }
    if (toInsert.length) await supabase.from('taxas').insert(toInsert);
  };

  const recalcServicesForBandeira = async (bandeiraId: string, newTaxas: BandeiraTaxas) => {
    const { data: pagamentos } = await supabase.from('servicos_pagamentos').select('*').eq('bandeira_id', bandeiraId);
    if (!pagamentos?.length) return;

    const servicoIds = [...new Set(pagamentos.map(p => p.servico_id))];

    for (const pag of pagamentos) {
      let newRate = 0;
      if (pag.tipo === 'debito') newRate = parseFloat(newTaxas.debito) || 0;
      else if (pag.tipo === 'credito_avista') newRate = parseFloat(newTaxas.credito_avista) || 0;
      else if (pag.tipo === 'credito_parcelado' && pag.parcelas) newRate = parseFloat(newTaxas.parcelado[pag.parcelas]) || 0;
      await supabase.from('servicos_pagamentos').update({ taxa_aplicada: newRate }).eq('id', pag.id);
    }

    for (const sId of servicoIds) {
      const { data: allPags } = await supabase.from('servicos_pagamentos').select('*').eq('servico_id', sId);
      const { data: srv } = await supabase.from('servicos').select('valor_total, custo_total').eq('id', sId).single();
      if (!allPags || !srv) continue;
      const totalTaxas = allPags.reduce((sum, p) => sum + (p.valor * (p.taxa_aplicada / 100)), 0);
      const valorLiquido = srv.valor_total - totalTaxas;
      const lucroLiquido = valorLiquido - srv.custo_total;
      await supabase.from('servicos').update({ valor_liquido: valorLiquido, lucro_liquido: lucroLiquido }).eq('id', sId);
    }
  };

  const handleUpdateBandeira = async (bi: number) => {
    const b = bandeirasForm[bi];
    if (!b.id) return;
    await saveTaxasForBandeira(b.id, b.taxas);
    await recalcServicesForBandeira(b.id, b.taxas);
    setOriginalBandeiras(prev => {
      const next = new Map(prev);
      next.set(b.id!, {
        debito: b.taxas.debito,
        credito_avista: b.taxas.credito_avista,
        parcelado: { ...b.taxas.parcelado },
      });
      return next;
    });
    toast.success('Taxas atualizadas e serviços recalculados!');
    setUpdateConfirm(null);
  };

  const save = async () => {
    if (!nome.trim()) { toast.error('Nome obrigatório'); return; }

    const names = bandeirasForm.filter(b => b.nome.trim()).map(b => b.nome.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      toast.error('Existem nomes de bandeiras duplicados.');
      return;
    }

    let maqId = editId;

    if (editId) {
      await supabase.from('maquininhas').update({ nome, taxa_pix_maquina: parseFloat(taxaPixMaquina) || 0 }).eq('id', editId);

      const { data: existingBands } = await supabase.from('bandeiras').select('id, nome').eq('maquininha_id', editId);
      const existingIds = new Set((existingBands || []).map(b => b.id));
      const formIds = new Set(bandeirasForm.filter(b => b.id).map(b => b.id!));

      for (const eb of (existingBands || [])) {
        if (!formIds.has(eb.id)) {
          if (bandeirasEmUso.has(eb.id)) continue;
          await supabase.from('taxas').delete().eq('bandeira_id', eb.id);
          await supabase.from('bandeiras').delete().eq('id', eb.id);
        }
      }

      for (const b of bandeirasForm) {
        if (!b.nome.trim()) continue;
        if (b.id && existingIds.has(b.id)) {
          await supabase.from('bandeiras').update({ nome: b.nome }).eq('id', b.id);
          if (!bandeirasEmUso.has(b.id)) {
            await saveTaxasForBandeira(b.id, b.taxas);
          }
        } else {
          const { data: band } = await supabase.from('bandeiras').insert({ maquininha_id: editId, nome: b.nome }).select().single();
          if (band) await saveTaxasForBandeira(band.id, b.taxas);
        }
      }
    } else {
      const { data } = await supabase.from('maquininhas').insert({ nome, taxa_pix_maquina: parseFloat(taxaPixMaquina) || 0 }).select().single();
      maqId = data?.id;
      if (!maqId) return;

      for (const b of bandeirasForm) {
        if (!b.nome.trim()) continue;
        const { data: band } = await supabase.from('bandeiras').insert({ maquininha_id: maqId, nome: b.nome }).select().single();
        if (band) await saveTaxasForBandeira(band.id, b.taxas);
      }
    }

    toast.success('Maquininha salva!');
    setShowForm(false);
    setEditId(null);
    fetchMaquininhas();
  };

  const addBandeira = () => setBandeirasForm(prev => [...prev, emptyBandeira()]);

  const updateBandeiraField = (bi: number, updater: (b: Bandeira) => Bandeira) => {
    setBandeirasForm(prev => prev.map((b, i) => i === bi ? updater({ ...b, taxas: { ...b.taxas, parcelado: { ...b.taxas.parcelado } } }) : b));
  };

  const removeBandeira = (bi: number) => {
    const b = bandeirasForm[bi];
    if (b.id && bandeirasEmUso.has(b.id)) {
      toast.error('Não é possível remover bandeira usada em serviços já salvos.');
      return;
    }
    setBandeirasForm(prev => prev.filter((_, i) => i !== bi));
  };

  const isBandeiraChanged = (b: Bandeira): boolean => {
    if (!b.id) return false;
    const orig = originalBandeiras.get(b.id);
    if (!orig) return false;
    return !taxasEqual(b.taxas, orig);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <CreditCard className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Maquininhas</h1>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">Gerencie maquininhas, bandeiras e taxas. Maquininhas inativas não aparecem ao registrar pagamentos.</p>
          <Button onClick={() => { setNome(''); setTaxaPixMaquina(''); setEditId(null); setOriginalBandeiras(new Map()); setBandeirasEmUso(new Set()); setBandeirasForm([emptyBandeira()]); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Nova Maquininha
          </Button>
        </div>
        <div className="space-y-2">
          {maquininhas.map(m => {
            const ativo = m.ativo !== false;
            return (
              <div key={m.id}
                className={`bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4 transition-colors hover:border-primary/40 ${!ativo ? 'opacity-60' : ''}`}>
                <div onClick={() => loadMaquininha(m.id)} className="flex-1 cursor-pointer min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-foreground font-medium">{m.nome}</p>
                    {!ativo && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{m.bandeiras?.length || 0} bandeira(s)</p>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{ativo ? 'Ativa' : 'Inativa'}</span>
                  <Switch checked={ativo} onCheckedChange={() => toggleAtivo(m.id, ativo)} />
                </div>
              </div>
            );
          })}
          {maquininhas.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma maquininha cadastrada.</p>}
        </div>
      </div>

      {/* Maquininha Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-popover border-border">
          <DialogHeader><DialogTitle>{editId ? 'Editar Maquininha' : 'Nova Maquininha'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Cielo" className="bg-card border-border" /></div>

            <div className="bg-card border border-border rounded-lg p-4">
              <Label className="text-sm font-semibold">Taxa Pix Máquina (%)</Label>
              <Input type="number" step="0.01" value={taxaPixMaquina} onChange={e => setTaxaPixMaquina(e.target.value)} placeholder="Ex: 0.99" className="bg-background border-border mt-1" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Bandeiras</Label>
                <Button size="sm" variant="ghost" onClick={addBandeira}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
              </div>

              {bandeirasForm.map((b, bi) => {
                const isDuplicate = hasDuplicateName(bandeirasForm, bi);
                const inUse = !!(b.id && bandeirasEmUso.has(b.id));
                const changed = isBandeiraChanged(b);

                return (
                  <div key={bi} className="bg-card border border-border rounded-lg p-4 mb-3 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="flex-1 w-full">
                        <Input value={b.nome} onChange={e => updateBandeiraField(bi, bb => { bb.nome = e.target.value; return bb; })}
                          placeholder="Nome da bandeira (ex: Visa)" className="bg-background border-border" />
                        {isDuplicate && (
                          <p className="text-destructive text-xs mt-1">* Este nome já está em uso nesta maquininha. Utilize um nome diferente.</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {inUse && <Badge variant="secondary" className="text-xs whitespace-nowrap">Em uso</Badge>}
                        {inUse && changed && (
                          <Button size="sm" variant="outline" className="text-primary border-primary/50 hover:bg-primary/10"
                            disabled={isDuplicate}
                            onClick={() => setUpdateConfirm({ bandeiraIndex: bi })}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
                          </Button>
                        )}
                        <Button variant="ghost" size="icon"
                          className={inUse ? "text-muted-foreground cursor-not-allowed opacity-40" : "text-destructive hover:text-destructive/80 hover:bg-destructive/10"}
                          disabled={inUse}
                          onClick={() => removeBandeira(bi)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={save} disabled={bandeirasForm.some((_, i) => hasDuplicateName(bandeirasForm, i))}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!updateConfirm} onOpenChange={open => !open && setUpdateConfirm(null)}>
        <AlertContent>
          <AlertHeader>
            <AlertTitle>Confirmar atualização</AlertTitle>
            <AlertDialogDescription>
              Estas mudanças irão modificar os valores de serviços que já utilizem essa bandeira. Deseja continuar?
            </AlertDialogDescription>
          </AlertHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => updateConfirm && handleUpdateBandeira(updateConfirm.bandeiraIndex)}>
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertContent>
      </AlertDialog>
    </div>
  );
}
