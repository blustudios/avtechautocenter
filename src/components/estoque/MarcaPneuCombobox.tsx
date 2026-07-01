import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface MarcaPneu { id: string; nome: string; }

interface Props {
  marcas: MarcaPneu[];
  value: string | null;
  onChange: (id: string) => void;
  onCreated?: (marca: MarcaPneu) => void;
}

export function MarcaPneuCombobox({ marcas, value, onChange, onCreated }: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [showCreate, setShowCreate] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const selected = marcas.find(m => m.id === value);

  const hasMatch = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return marcas.some(m => m.nome.toLowerCase().includes(q));
  }, [query, marcas]);

  const openCreate = () => {
    setNewName(query.trim());
    setShowCreate(true);
    setOpen(false);
  };

  const saveNew = async () => {
    const n = newName.trim();
    if (!n) { toast.error('Informe o nome da marca'); return; }
    if (marcas.some(m => m.nome.toLowerCase() === n.toLowerCase())) {
      toast.error('Marca já cadastrada');
      return;
    }
    const { data, error } = await supabase.from('marcas_pneus').insert({ nome: n }).select().single();
    if (error || !data) { toast.error('Erro ao cadastrar marca'); return; }
    toast.success('Marca cadastrada!');
    setShowCreate(false);
    setNewName('');
    onCreated?.(data as MarcaPneu);
    onChange((data as MarcaPneu).id);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between bg-card border-border font-normal">
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>
              {selected ? selected.nome : 'Selecione ou digite uma marca...'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar marca..." value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 text-sm text-muted-foreground">Nenhuma marca encontrada.</div>
              </CommandEmpty>
              <CommandGroup>
                {marcas.map(m => (
                  <CommandItem key={m.id} value={m.nome} onSelect={() => { onChange(m.id); setOpen(false); setQuery(''); }}>
                    <Check className={cn('mr-2 h-4 w-4', value === m.id ? 'opacity-100' : 'opacity-0')} />
                    {m.nome}
                  </CommandItem>
                ))}
              </CommandGroup>
              {!hasMatch && query.trim() && (
                <div className="border-t border-border p-1">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); openCreate(); }}
                    className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground text-primary"
                  >
                    <Plus className="w-4 h-4" /> Cadastrar nova marca "{query.trim()}"
                  </button>
                </div>
              )}
              {hasMatch && (
                <div className="border-t border-border p-1">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); openCreate(); }}
                    className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                  >
                    <Plus className="w-4 h-4" /> Cadastrar nova marca
                  </button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-popover border-border max-w-sm">
          <DialogHeader><DialogTitle>Nova marca de pneu</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da marca</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} className="bg-card border-border" autoFocus
                onKeyDown={e => e.key === 'Enter' && saveNew()} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button onClick={saveNew}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
