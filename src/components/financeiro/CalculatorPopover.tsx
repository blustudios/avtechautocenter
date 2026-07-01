import { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  onApply: (n: number) => void;
  ariaLabel?: string;
}

type Op = '+' | '-' | '*' | '/';

function evaluate(expr: string): number | null {
  const s = expr.replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  if (!/^[\d.+\-*/\s]+$/.test(s)) return null;
  // Tokenize
  const tokens: (number | Op)[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if ('+-*/'.includes(c) && (tokens.length === 0 || typeof tokens[tokens.length - 1] !== 'number')) {
      // unary handling: allow leading minus
      if (c === '-' && (tokens.length === 0)) {
        // parse number with sign
        let j = i + 1; let numStr = '-';
        while (j < s.length && /[\d.]/.test(s[j])) { numStr += s[j]; j++; }
        const n = parseFloat(numStr); if (isNaN(n)) return null;
        tokens.push(n); i = j; continue;
      }
      return null;
    }
    if ('+-*/'.includes(c)) { tokens.push(c as Op); i++; continue; }
    if (/[\d.]/.test(c)) {
      let j = i; let numStr = '';
      while (j < s.length && /[\d.]/.test(s[j])) { numStr += s[j]; j++; }
      const n = parseFloat(numStr); if (isNaN(n)) return null;
      tokens.push(n); i = j; continue;
    }
    return null;
  }
  if (tokens.length === 0) return null;
  // First pass: * /
  const pass1: (number | Op)[] = [tokens[0]];
  for (let k = 1; k < tokens.length; k += 2) {
    const op = tokens[k] as Op; const b = tokens[k + 1] as number;
    if (typeof b !== 'number') return null;
    if (op === '*' || op === '/') {
      const a = pass1.pop() as number;
      if (op === '/' && b === 0) return null;
      pass1.push(op === '*' ? a * b : a / b);
    } else {
      pass1.push(op, b);
    }
  }
  // Second pass: + -
  let result = pass1[0] as number;
  for (let k = 1; k < pass1.length; k += 2) {
    const op = pass1[k] as Op; const b = pass1[k + 1] as number;
    result = op === '+' ? result + b : result - b;
  }
  return result;
}

export function CalculatorPopover({ onApply, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) { setExpr(''); setResult(null); setError(false); }
  }, [open]);

  useEffect(() => {
    if (!expr) { setResult(null); setError(false); return; }
    const r = evaluate(expr);
    if (r === null || !isFinite(r)) { setResult(null); setError(true); }
    else { setResult(r); setError(false); }
  }, [expr]);

  const press = (v: string) => {
    if (v === 'C') { setExpr(''); return; }
    if (v === '⌫') { setExpr((e) => e.slice(0, -1)); return; }
    if (v === '=') { if (result !== null) setExpr(String(result)); return; }
    setExpr((e) => e + v);
  };

  const apply = () => {
    const val = result ?? evaluate(expr);
    if (val === null || !isFinite(val)) return;
    onApply(Math.round(val * 100) / 100);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); apply(); return; }
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'Backspace') { e.preventDefault(); press('⌫'); return; }
    if (/^[\d]$/.test(e.key)) { press(e.key); return; }
    if (e.key === '.' || e.key === ',') { press('.'); return; }
    if ('+-*/'.includes(e.key)) { press(e.key); return; }
  };

  const btns: { label: string; val: string; variant?: 'outline' | 'secondary' | 'default' }[] = [
    { label: 'C', val: 'C', variant: 'secondary' },
    { label: '⌫', val: '⌫', variant: 'secondary' },
    { label: '÷', val: '/', variant: 'secondary' },
    { label: '×', val: '*', variant: 'secondary' },
    { label: '7', val: '7', variant: 'outline' },
    { label: '8', val: '8', variant: 'outline' },
    { label: '9', val: '9', variant: 'outline' },
    { label: '−', val: '-', variant: 'secondary' },
    { label: '4', val: '4', variant: 'outline' },
    { label: '5', val: '5', variant: 'outline' },
    { label: '6', val: '6', variant: 'outline' },
    { label: '+', val: '+', variant: 'secondary' },
    { label: '1', val: '1', variant: 'outline' },
    { label: '2', val: '2', variant: 'outline' },
    { label: '3', val: '3', variant: 'outline' },
    { label: '=', val: '=', variant: 'default' },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={ariaLabel || 'Abrir calculadora'}
          className="shrink-0"
        >
          <Calculator className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align="end"
        onKeyDown={onKey}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-3">
          <div className="rounded-md border border-input bg-background px-3 py-2 min-h-[56px] flex flex-col items-end justify-center">
            <span className="text-xs text-muted-foreground truncate max-w-full">{expr || '0'}</span>
            <span className={`text-lg font-semibold ${error ? 'text-destructive' : 'text-foreground'}`}>
              {error ? 'Erro' : (result !== null ? result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—')}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {btns.map((b) => (
              <Button
                key={b.label}
                type="button"
                variant={b.variant}
                size="sm"
                className="h-9"
                onClick={() => press(b.val)}
              >
                {b.label}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 col-span-2"
              onClick={() => press('0')}
            >
              0
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 col-span-2"
              onClick={() => press('.')}
            >
              .
            </Button>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={apply}
              disabled={result === null || error}
            >
              Usar valor
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
