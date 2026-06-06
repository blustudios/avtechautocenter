// Helpers compartilhados para regras de pagamento.

export const needsMaquininha = (tipo: string) =>
  !['Pix CNPJ', 'Dinheiro', 'A Definir', ''].includes(tipo);

export const needsBandeira = (tipo: string) =>
  !['Pix CNPJ', 'Dinheiro', 'Pix Máquina', 'A Definir', ''].includes(tipo);

export const needsParcelas = (tipo: string) => tipo === 'Crédito Parcelado';

export interface MaquininhaRef { id: string; taxa_pix_maquina?: number | string | null }
export interface TaxaRef {
  bandeira_id: string;
  tipo_pagamento: string;
  percentual: number | string;
  parcelas_de?: number | null;
  parcelas_ate?: number | null;
}

export function getTaxRate(
  tipo: string,
  maquininha_id: string,
  bandeira_id: string,
  parcelas: number,
  maquininhas: MaquininhaRef[],
  taxas: TaxaRef[],
): number {
  if (tipo === 'Pix CNPJ' || tipo === 'Dinheiro' || tipo === 'A Definir' || !tipo) return 0;
  if (tipo === 'Pix Máquina') {
    const maq = maquininhas.find(m => m.id === maquininha_id);
    return maq ? Number(maq.taxa_pix_maquina) || 0 : 0;
  }
  let tipoDb = '';
  if (tipo === 'Débito') tipoDb = 'debito';
  else if (tipo === 'Crédito à vista') tipoDb = 'credito_avista';
  else if (tipo === 'Crédito Parcelado') tipoDb = 'credito_parcelado';
  if (tipoDb === 'credito_parcelado') {
    const tx = taxas.find(t => t.bandeira_id === bandeira_id && t.tipo_pagamento === tipoDb &&
      parcelas >= (t.parcelas_de || 0) && parcelas <= (t.parcelas_ate || 999));
    return tx ? Number(tx.percentual) : 0;
  }
  const tx = taxas.find(t => t.bandeira_id === bandeira_id && t.tipo_pagamento === tipoDb);
  return tx ? Number(tx.percentual) : 0;
}

export interface PagamentoLike {
  pago: boolean;
  data_pagamento: string | null;
}

export function calcPaymentStatus(pagamentos: PagamentoLike[]): string {
  if (pagamentos.length === 0) return 'pendente';
  const allPago = pagamentos.every(p => p.pago);
  if (allPago) return 'pago';
  const today = new Date().toISOString().split('T')[0];
  const hasOverdue = pagamentos.some(p => !p.pago && p.data_pagamento && p.data_pagamento < today);
  if (hasOverdue) return 'em_atraso';
  const hasPago = pagamentos.some(p => p.pago);
  const hasUnpaid = pagamentos.some(p => !p.pago);
  if (hasPago && hasUnpaid) return 'pendente_parcial';
  return 'pendente';
}

export interface PagamentoErrorInput {
  tipo: string;
  maquininha_id: string | null;
  bandeira_id: string | null;
  parcelas: number | null;
  pago: boolean;
}

export function findPagamentoErrors(p: PagamentoErrorInput): string[] {
  const errs: string[] = [];
  if (!p.tipo) errs.push('Sem Tipo');
  if (needsMaquininha(p.tipo) && !p.maquininha_id) errs.push('Sem Maquininha');
  if (needsBandeira(p.tipo) && !p.bandeira_id) errs.push('Sem Bandeira');
  if (needsParcelas(p.tipo) && (!p.parcelas || p.parcelas < 1)) errs.push('Sem Parcelas');
  if (p.pago && p.tipo === 'A Definir') errs.push('Pago com tipo "A Definir"');
  return errs;
}
