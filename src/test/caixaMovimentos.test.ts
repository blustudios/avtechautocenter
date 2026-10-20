import { describe, it, expect } from 'vitest';
import { calcSaldoDinheiro, usaMovimentos } from '@/lib/financeiro/caixaMovimentos';

describe('saldo do dinheiro', () => {
  it('soma anterior + depósitos − saques', () => {
    expect(calcSaldoDinheiro(100, [
      { tipo: 'deposito', valor: 50 }, { tipo: 'saque', valor: 30 },
    ])).toBe(120);
  });
  it('novo sistema só a partir de outubro/2026', () => {
    expect(usaMovimentos('2026-09-01')).toBe(false);
    expect(usaMovimentos('2026-10-01')).toBe(true);
  });
});
