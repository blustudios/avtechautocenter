import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, PaymentBadge } from '@/components/StatusBadge';
import { formatCurrency, statusLabels, paymentStatusLabels } from '@/lib/format';
import { Pencil, FileImage, User, Car, Wrench, DollarSign, CreditCard, MessageSquare, CircleDot } from 'lucide-react';
import html2canvas from 'html2canvas';

interface Props {
  serviceId: string;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
}

export function ServiceViewDialog({ serviceId, open, onClose, onEdit }: Props) {
  const [service, setService] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [custos, setCustos] = useState<any[]>([]);
  const [pneus, setPneus] = useState<any[]>([]);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: s } = await supabase.from('servicos').select('*, clientes(nome, whatsapp), carros(marca, modelo, ano, cor, placa)').eq('id', serviceId).single();
      setService(s);
      const { data: it } = await supabase.from('servicos_itens').select('*').eq('servico_id', serviceId).order('ordem');
      setItens(it || []);
      const { data: pg } = await supabase.from('servicos_pagamentos').select('*, maquininhas(nome), bandeiras(nome)').eq('servico_id', serviceId);
      setPagamentos(pg || []);
      const { data: ct } = await supabase.from('servicos_custos').select('*, fornecedores(nome)').eq('servico_id', serviceId);
      setCustos(ct || []);
      const { data: pn } = await supabase.from('servicos_pneus').select('*, estoque_pneus(marca, medida_01, medida_02, aro)').eq('servico_id', serviceId);
      setPneus(pn || []);
    };
    if (serviceId) load();
  }, [serviceId]);

  const generateReceipt = async () => {
    if (!receiptRef.current) return;
    receiptRef.current.style.display = 'block';
    const canvas = await html2canvas(receiptRef.current, { backgroundColor: '#1A1A1A', scale: 2 });
    receiptRef.current.style.display = 'none';
    const link = document.createElement('a');
    link.download = `recibo_${serviceId}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  if (!service) return null;

  const car = service.carros;
  const client = service.clientes;
  const carDisplay = car ?
    `${car.marca} ${car.modelo} · ${car.placa}` :
    service.carro_marca || service.carro_modelo ?
    `${service.carro_marca || ''} ${service.carro_modelo || ''} · Sem Placa`.trim() :
    '—';

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-popover border-border w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-primary">{service.id}</span>
              <StatusBadge status={service.status} />
              <PaymentBadge status={service.status_pagamento} />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Informações
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente</span><p className="text-foreground font-medium">{client?.nome || '—'}</p></div>
                <div><span className="text-muted-foreground">Carro</span><p className="text-foreground font-medium">{carDisplay}</p></div>
                <div><span className="text-muted-foreground">Entrada</span><p className="text-foreground">{new Date(service.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR')}</p></div>
                <div><span className="text-muted-foreground">Finalizado em</span><p className="text-foreground">{service.data_encerramento ? new Date(service.data_encerramento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</p></div>
              </div>
            </div>

            {itens.length > 0 && <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5" /> Serviços Realizados
                </h4>
                <ul className="space-y-1">
                  {itens.map((i, idx) => <li key={idx} className="text-foreground text-sm">• {i.descricao}</li>)}
                </ul>
              </div>
            </>}

            {pneus.length > 0 && <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CircleDot className="w-3.5 h-3.5" /> Pneus
                </h4>
                {pneus.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-foreground border-b border-border py-1.5 last:border-0">
                    <span>
                      {p.quantidade}x {p.estoque_pneus ? `${p.estoque_pneus.marca} ${p.estoque_pneus.medida_01}/${p.estoque_pneus.medida_02} ${p.estoque_pneus.aro}` : 'Pneu'}
                      {p.baixa_estoque && <span className="text-xs text-emerald-500 ml-2">(baixa realizada)</span>}
                    </span>
                    <span>{formatCurrency(Number(p.valor_unitario) * Number(p.quantidade))}</span>
                  </div>
                ))}
              </div>
            </>}

            {custos.length > 0 && <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5" /> Custos
                </h4>
                {custos.map((c, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-foreground border-b border-border py-1.5 last:border-0">
                    <span>{c.item} {c.fornecedores?.nome ? <span className="text-muted-foreground">({c.fornecedores.nome})</span> : ''} <span className="text-muted-foreground">×{c.quantidade}</span></span>
                    <span>{formatCurrency(Number(c.valor) * Number(c.quantidade))}</span>
                  </div>
                ))}
              </div>
            </>}

            {pagamentos.length > 0 && <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" /> Pagamentos
                </h4>
                {pagamentos.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-foreground border-b border-border py-1.5 last:border-0">
                    <div>
                      <span>{p.tipo} {p.bandeiras?.nome ? `(${p.bandeiras.nome})` : ''} {p.parcelas ? `${p.parcelas}x` : ''}</span>
                      {(p as any).data_pagamento && <span className="text-muted-foreground text-xs ml-2">{new Date((p as any).data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                    </div>
                    <span>{formatCurrency(Number(p.valor))} <span className="text-muted-foreground text-xs">({p.taxa_aplicada}%)</span></span>
                  </div>
                ))}
              </div>
            </>}

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-lg p-3">
                <span className="text-xs text-muted-foreground">Total</span>
                <p className="text-lg font-semibold">{formatCurrency(Number(service.valor_total))}</p>
              </div>
              <div className="bg-card rounded-lg p-3">
                <span className="text-xs text-muted-foreground">Líquido</span>
                <p className="text-lg font-semibold">{formatCurrency(Number(service.valor_liquido))}</p>
              </div>
              <div className="bg-card rounded-lg p-3">
                <span className="text-xs text-muted-foreground">Custos</span>
                <p className="text-lg font-semibold">{formatCurrency(Number(service.custo_total))}</p>
              </div>
              <div className="bg-card rounded-lg p-3">
                <span className="text-xs text-muted-foreground">Lucro</span>
                <p className={`text-lg font-semibold ${Number(service.lucro_liquido) >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {formatCurrency(Number(service.lucro_liquido))}
                </p>
              </div>
            </div>

            {service.observacoes && <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Observações
                </h4>
                <p className="text-foreground text-sm">{service.observacoes}</p>
              </div>
            </>}

            <Separator />

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <Button variant="outline" onClick={generateReceipt} className="w-full sm:w-auto">
                <FileImage className="w-4 h-4 mr-2" /> Gerar Recibo
              </Button>
              <Button onClick={() => onEdit(serviceId)} className="w-full sm:w-auto">
                <Pencil className="w-4 h-4 mr-2" /> Editar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden receipt for export */}
      <div ref={receiptRef} style={{ display: 'none', width: 540, padding: 40, fontFamily: 'Inter, sans-serif', color: '#FFFFFF', background: '#1A1A1A' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#F97316' }}>AV Tech</div>
          <div style={{ fontSize: 14, color: '#B0B0B0' }}>Auto Center · Itatiba-SP</div>
        </div>
        <hr style={{ borderColor: '#3D3D3D', margin: '16px 0' }} />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: '#B0B0B0' }}>Cliente</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{client?.nome}</div>
        </div>
        {(car || service.carro_marca || service.carro_modelo) &&
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: '#B0B0B0' }}>Veículo</div>
            <div style={{ fontSize: 16 }}>{car ? `${car.marca} ${car.modelo} ${car.ano} ${car.cor} · ${car.placa}` : `${service.carro_marca || ''} ${service.carro_modelo || ''} · Sem Placa`}</div>
          </div>
        }
        <hr style={{ borderColor: '#3D3D3D', margin: '16px 0' }} />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: '#B0B0B0', marginBottom: 4 }}>Serviços</div>
          {itens.map((it, i) => <div key={i} style={{ fontSize: 14, marginBottom: 2 }}>• {it.descricao}</div>)}
        </div>
        {pneus.length > 0 && <>
          <hr style={{ borderColor: '#3D3D3D', margin: '16px 0' }} />
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: '#B0B0B0', marginBottom: 4 }}>Pneus</div>
            {pneus.map((p, i) => <div key={i} style={{ fontSize: 14 }}>
              {p.quantidade}x {p.estoque_pneus ? `${p.estoque_pneus.marca} ${p.estoque_pneus.medida_01}/${p.estoque_pneus.medida_02} ${p.estoque_pneus.aro}` : 'Pneu'} — {formatCurrency(Number(p.valor_unitario) * Number(p.quantidade))}
            </div>)}
          </div>
        </>}
        <hr style={{ borderColor: '#3D3D3D', margin: '16px 0' }} />
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <div style={{ fontSize: 14, color: '#B0B0B0' }}>Valor Total</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#F97316' }}>{formatCurrency(Number(service.valor_total))}</div>
        </div>
        {pagamentos.length > 0 &&
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: '#B0B0B0', marginBottom: 4 }}>Pagamento</div>
            {pagamentos.map((p, i) => <div key={i} style={{ fontSize: 14 }}>{p.tipo} {p.parcelas ? `${p.parcelas}x` : ''} — {formatCurrency(Number(p.valor))}</div>)}
          </div>
        }
        <hr style={{ borderColor: '#3D3D3D', margin: '16px 0' }} />
        <div style={{ textAlign: 'center', fontSize: 13, color: '#B0B0B0' }}>
          Obrigado pela preferência! · AV Tech
        </div>
      </div>
    </>
  );
}
