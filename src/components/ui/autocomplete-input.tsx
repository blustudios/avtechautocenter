import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
}

export function AutocompleteInput({ value, onChange, suggestions, className, ...props }: AutocompleteInputProps) {
  const [open, setOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    if (!value.trim()) return [];
    const q = value.trim().toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 8);
  }, [value, suggestions]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  React.useEffect(() => { setHighlightIndex(-1); }, [filtered]);

  const select = (val: string) => { onChange(val); setOpen(false); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !filtered.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && highlightIndex >= 0) { e.preventDefault(); select(filtered[highlightIndex]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => value.trim() && setOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn(className)}
        {...props}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
          {filtered.map((item, i) => (
            <div
              key={item}
              onMouseDown={() => select(item)}
              className={cn(
                'px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground',
                i === highlightIndex && 'bg-accent text-accent-foreground'
              )}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
