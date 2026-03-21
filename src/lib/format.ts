export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
}

export function formatPlaca(value: string): string {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
}

export const statusLabels: Record<string, string> = {
  a_iniciar: 'À Iniciar',
  em_progresso: 'Em Progresso',
  entregue: 'Entregue',
};

export const paymentStatusLabels: Record<string, string> = {
  pendente: 'Pendente Pagamento',
  pendente_parcial: 'Pendente Parcial',
  em_atraso: 'Pagamento Em Atraso',
  pago: 'Pago',
};

export const tiposPagamento = [
  'A Definir',
  'Pix CNPJ',
  'Pix Máquina',
  'Débito',
  'Crédito à vista',
  'Crédito Parcelado',
  'Dinheiro',
];

export const CAR_COLORS = [
  { label: 'Branco', hex: '#FFFFFF' },
  { label: 'Cinza', hex: '#9CA3AF' },
  { label: 'Preto', hex: '#000000' },
  { label: 'Azul', hex: '#3B82F6' },
  { label: 'Vermelho', hex: '#EF4444' },
  { label: 'Amarelo', hex: '#EAB308' },
  { label: 'Verde', hex: '#22C55E' },
];
