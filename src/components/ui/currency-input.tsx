import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export function CurrencyInput({ value, onChange, className, placeholder, readOnly }: CurrencyInputProps) {
  const formatDisplay = (val: string) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;
    
    // Allow: backspace, delete, tab, escape, enter
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(e.key)) {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const cents = Math.round((parseFloat(value) || 0) * 100);
        const newCents = Math.floor(cents / 10);
        onChange((newCents / 100).toFixed(2));
      }
      return;
    }

    // Only allow digits
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const cents = Math.round((parseFloat(value) || 0) * 100);
    const newCents = cents * 10 + parseInt(e.key);
    // Cap at 999999999 cents (R$ 9.999.999,99)
    if (newCents > 999999999) return;
    onChange((newCents / 100).toFixed(2));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatDisplay(value)}
      onKeyDown={handleKeyDown}
      onChange={() => {}} // controlled via onKeyDown
      readOnly={readOnly}
      placeholder={placeholder}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-right ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
    />
  );
}
