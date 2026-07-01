import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Fornecedor { id: string; nome: string; }

interface Props {
  fornecedores: Fornecedor[];
  value: string | null;
  onChange: (id: string | null) => void;
}

export function FornecedorCombobox({ fornecedores, value, onChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = fornecedores.find(f => f.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between bg-card border-border font-normal">
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.nome : 'Selecionar fornecedor (opcional)...'}
          </span>
          <div className="flex items-center gap-1">
            {selected && (
              <span
                role="button"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(null); }}
                className="p-0.5 rounded hover:bg-accent"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar fornecedor..." />
          <CommandList>
            <CommandEmpty>Nenhum fornecedor.</CommandEmpty>
            <CommandGroup>
              {fornecedores.map(f => (
                <CommandItem key={f.id} value={f.nome} onSelect={() => { onChange(f.id); setOpen(false); }}>
                  <Check className={cn('mr-2 h-4 w-4', value === f.id ? 'opacity-100' : 'opacity-0')} />
                  {f.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
