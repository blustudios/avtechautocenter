import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, ChevronDown, ChevronRight, Upload, HelpCircle, Car, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function MarcasModelos() {
  const navigate = useNavigate();
  const [marcas, setMarcas] = useState<{ id: string; nome: string }[]>([]);
  const [modelos, setModelos] = useState<{ id: string; marca_id: string; nome: string }[]>([]);
  const [openMarcaIds, setOpenMarcaIds] = useState<Set<string>>(new Set());
  const [newMarcaNome, setNewMarcaNome] = useState('');
  const [newModeloNome, setNewModeloNome] = useState<Record<string, string>>({});
  const [showXmlImport, setShowXmlImport] = useState(false);

  const fetchMarcasModelos = useCallback(async () => {
    const [mRes, mdRes] = await Promise.all([
      supabase.from('marcas_carros').select('*').order('nome'),
      supabase.from('modelos_carros').select('*').order('nome'),
    ]);
    setMarcas(mRes.data || []);
    setModelos(mdRes.data || []);
  }, []);

  useEffect(() => { fetchMarcasModelos(); }, [fetchMarcasModelos]);

  const addMarca = async () => {
    const n = newMarcaNome.trim();
    if (!n) return;
    if (marcas.some(m => m.nome.toLowerCase() === n.toLowerCase())) { toast.error('Marca já cadastrada'); return; }
    await supabase.from('marcas_carros').insert({ nome: n });
    setNewMarcaNome('');
    fetchMarcasModelos();
    toast.success('Marca adicionada!');
  };

  const deleteMarca = async (id: string) => {
    await supabase.from('marcas_carros').delete().eq('id', id);
    fetchMarcasModelos();
    toast.success('Marca removida!');
  };

  const addModelo = async (marcaId: string) => {
    const n = (newModeloNome[marcaId] || '').trim();
    if (!n) return;
    if (modelos.some(m => m.marca_id === marcaId && m.nome.toLowerCase() === n.toLowerCase())) { toast.error('Modelo já cadastrado nesta marca'); return; }
    await supabase.from('modelos_carros').insert({ marca_id: marcaId, nome: n });
    setNewModeloNome(prev => ({ ...prev, [marcaId]: '' }));
    fetchMarcasModelos();
    toast.success('Modelo adicionado!');
  };

  const deleteModelo = async (id: string) => {
    await supabase.from('modelos_carros').delete().eq('id', id);
    fetchMarcasModelos();
  };

  const handleXmlImport = async (file: File) => {
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      if (doc.querySelector('parsererror')) { toast.error('XML inválido'); return; }

      const [mRes, mdRes] = await Promise.all([
        supabase.from('marcas_carros').select('*'),
        supabase.from('modelos_carros').select('*'),
      ]);
      const currentMarcas = mRes.data || [];
      const currentModelos = mdRes.data || [];

      const marcaEls = doc.querySelectorAll('marca');
      let marcasAdded = 0, modelosAdded = 0;

      for (const marcaEl of Array.from(marcaEls)) {
        const marcaNome = (marcaEl.getAttribute('nome') || '').trim();
        if (!marcaNome) continue;

        let marcaRow = currentMarcas.find(m => m.nome.toLowerCase() === marcaNome.toLowerCase());
        if (!marcaRow) {
          const { data } = await supabase.from('marcas_carros').insert({ nome: marcaNome }).select().single();
          if (data) { marcaRow = data; currentMarcas.push(data); marcasAdded++; }
          else continue;
        }

        for (const modEl of Array.from(marcaEl.querySelectorAll('modelo'))) {
          const modNome = (modEl.textContent || '').trim();
          if (!modNome) continue;
          const exists = currentModelos.some(m => m.marca_id === marcaRow!.id && m.nome.toLowerCase() === modNome.toLowerCase());
          if (!exists) {
            const { data, error } = await supabase.from('modelos_carros').insert({ marca_id: marcaRow!.id, nome: modNome }).select().single();
            if (!error && data) { currentModelos.push(data); modelosAdded++; }
          }
        }
      }

      await fetchMarcasModelos();
      toast.success(`Importação concluída: ${marcasAdded} marca(s) e ${modelosAdded} modelo(s) adicionados.`);
      setShowXmlImport(false);
    } catch {
      toast.error('Erro ao processar arquivo XML');
    }
  };

  const toggleMarcaOpen = (id: string) => {
    setOpenMarcaIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Car className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Marcas e Modelos</h1>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <p className="text-sm text-muted-foreground">Gerencie o catálogo de veículos usado no autocomplete dos serviços.</p>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon"><HelpCircle className="w-4 h-4" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm">
                <p className="font-semibold mb-2">Formato XML para importação:</p>
                <pre className="bg-muted rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap">{`<marcas>
  <marca nome="Fiat">
    <modelo>Uno</modelo>
    <modelo>Palio</modelo>
  </marca>
  <marca nome="Volkswagen">
    <modelo>Gol</modelo>
    <modelo>Polo</modelo>
  </marca>
</marcas>`}</pre>
                <p className="mt-2 text-muted-foreground">Marcas e modelos já existentes serão ignorados.</p>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={() => setShowXmlImport(true)}>
              <Upload className="w-4 h-4 mr-1" /> Importar XML
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Input value={newMarcaNome} onChange={e => setNewMarcaNome(e.target.value)}
            placeholder="Nova marca..." className="bg-card border-border"
            onKeyDown={e => e.key === 'Enter' && addMarca()} />
          <Button size="sm" onClick={addMarca}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
        </div>

        {marcas.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma marca cadastrada.</p>}

        <div className="space-y-2">
          {marcas.map(marca => {
            const isOpen = openMarcaIds.has(marca.id);
            const marcaModelos = modelos.filter(m => m.marca_id === marca.id);
            return (
              <Collapsible key={marca.id} open={isOpen} onOpenChange={() => toggleMarcaOpen(marca.id)}>
                <div className="bg-card border border-border rounded-lg">
                  <div className="flex items-center justify-between p-3">
                    <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <span className="font-medium text-foreground">{marca.nome}</span>
                      <span className="text-xs text-muted-foreground">({marcaModelos.length} modelo{marcaModelos.length !== 1 ? 's' : ''})</span>
                    </CollapsibleTrigger>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-7 w-7"
                      onClick={() => deleteMarca(marca.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2">
                      {marcaModelos.map(mod => (
                        <div key={mod.id} className="flex items-center justify-between bg-background rounded px-3 py-1.5">
                          <span className="text-sm">{mod.nome}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80"
                            onClick={() => deleteModelo(mod.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input value={newModeloNome[marca.id] || ''}
                          onChange={e => setNewModeloNome(prev => ({ ...prev, [marca.id]: e.target.value }))}
                          placeholder="Novo modelo..." className="bg-background border-border h-8 text-sm"
                          onKeyDown={e => e.key === 'Enter' && addModelo(marca.id)} />
                        <Button size="sm" variant="ghost" onClick={() => addModelo(marca.id)}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </div>

      <Dialog open={showXmlImport} onOpenChange={setShowXmlImport}>
        <DialogContent className="bg-popover border-border max-w-md">
          <DialogHeader><DialogTitle>Importar Marcas e Modelos (XML)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione um arquivo XML com o formato padrão. Marcas e modelos já existentes serão ignorados.
            </p>
            <Input type="file" accept=".xml" onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleXmlImport(file);
            }} className="bg-card border-border" />
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setShowXmlImport(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
