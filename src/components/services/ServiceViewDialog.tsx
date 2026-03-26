import { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, PaymentBadge } from '@/components/StatusBadge';
import { formatCurrency, statusLabels } from '@/lib/format';
import { Pencil, FileImage, User, Car, Wrench, DollarSign, CreditCard, MessageSquare, CircleDot, Download, X, CheckCircle, RotateCcw, Trash2, UserPlus } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { AssignClientDialog } from './AssignClientDialog';

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
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const [loadingData, setLoadingData] = useState(true);

  const load = async () => {
    setLoadingData(true);
    const [sRes, itRes, pgRes, ctRes, pnRes] = await Promise.all([
      supabase.from('servicos').select('*, clientes(nome, whatsapp), carros(marca, modelo, ano, cor, placa)').eq('id', serviceId).single(),
      supabase.from('servicos_itens').select('*').eq('servico_id', serviceId).order('ordem'),
      supabase.from('servicos_pagamentos').select('*, maquininhas(nome), bandeiras(nome)').eq('servico_id', serviceId),
      supabase.from('servicos_custos').select('*, fornecedores(nome)').eq('servico_id', serviceId),
      supabase.from('servicos_pneus').select('*, estoque_pneus(marca, medida_01, medida_02, aro)').eq('servico_id', serviceId),
    ]);
    setService(sRes.data);
    setItens(itRes.data || []);
    setPagamentos(pgRes.data || []);
    setCustos(ctRes.data || []);
    setPneus(pnRes.data || []);
    setLoadingData(false);
  };

  useEffect(() => {
    if (serviceId) load();
  }, [serviceId]);

  const logHistory = async (campo: string, anterior: string | null, novo: string | null) => {
    await supabase.from('servicos_historico').insert({
      servico_id: serviceId, campo, valor_anterior: anterior, valor_novo: novo,
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    const oldStatus = service.status;
    const updates: any = { status: newStatus };
    if (newStatus === 'orcamento') updates.data_orcamento = new Date().toISOString().split('T')[0];
    if (newStatus === 'finalizado') updates.data_encerramento = new Date().toISOString().split('T')[0];
    await supabase.from('servicos').update(updates).eq('id', serviceId);
    await logHistory('status', oldStatus, newStatus);
    toast.success(`Status alterado para ${statusLabels[newStatus]}`);
    setConfirmAction(null);
    onClose();
  };

  const handleDelete = async () => {
    const { data: pnData } = await supabase.from('servicos_pneus').select('*').eq('servico_id', serviceId);
    if (pnData?.length) {
      for (const p of pnData) {
        if (p.baixa_estoque) {
          const { data: cur } = await supabase.from('estoque_pneus').select('quantidade').eq('id', p.pneu_id).single();
          if (cur) await supabase.from('estoque_pneus').update({ quantidade: cur.quantidade + p.quantidade }).eq('id', p.pneu_id);
        }
      }
    }
    await supabase.from('servicos_pneus').delete().eq('servico_id', serviceId);
    await supabase.from('servicos_itens').delete().eq('servico_id', serviceId);
    await supabase.from('servicos_pagamentos').delete().eq('servico_id', serviceId);
    await supabase.from('servicos_custos').delete().eq('servico_id', serviceId);
    await supabase.from('servicos_historico').delete().eq('servico_id', serviceId);
    await supabase.from('servicos').delete().eq('id', serviceId);
    toast.success('Serviço excluído!');
    setConfirmAction(null);
    onClose();
  };

  const generateImage = async (label: string) => {
    if (!receiptRef.current) return;
    receiptRef.current.style.display = 'block';
    const canvas = await html2canvas(receiptRef.current, { backgroundColor: '#1A1A1A', scale: 2 });
    receiptRef.current.style.display = 'none';
    const link = document.createElement('a');
    link.download = `${label}_${serviceId}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  if (!service) return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-popover border-border w-[95vw] sm:w-full">
        <DialogHeader><DialogTitle><Skeleton className="h-6 w-48" /></DialogTitle></DialogHeader>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </DialogContent>
    </Dialog>
  );

  const car = service.carros;
  const client = service.clientes;
  const status = service.status as string;
  const isRapido = service.is_servico_rapido;

  const carDisplay = car
    ? `${car.marca} ${car.modelo} · ${car.placa}`
    : service.carro_marca_livre || service.carro_modelo_livre
      ? `${service.carro_marca_livre || ''} ${service.carro_modelo_livre || ''} · ${service.carro_placa_livre || 'Sem Placa'}`.trim()
      : service.carro_marca || service.carro_modelo
        ? `${service.carro_marca || ''} ${service.carro_modelo || ''} · Sem Placa`.trim()
        : '—';

  const isOrcamento = status === 'orcamento';
  const showPaymentTag = status === 'em_progresso';

  const confirmMessages: Record<string, { title: string; desc: string; confirm: string; action: () => void }> = {
    cancelar_orcamento: {
      title: 'Cancelar Orçamento',
      desc: 'Deseja cancelar este orçamento? Esta ação irá arquivá-lo como Cancelado.',
      confirm: 'Sim, cancelar',
      action: () => handleStatusChange('cancelado'),
    },
    reabrir_orcamento: {
      title: 'Reabrir Orçamento',
      desc: 'Deseja reabrir este orçamento? A data do orçamento será atualizada para hoje.',
      confirm: 'Sim, reabrir',
      action: () => handleStatusChange('orcamento'),
    },
    executar_servico: {
      title: 'Executar Serviço',
      desc: 'Deseja iniciar a execução deste serviço? O status mudará para Em Progresso.',
      confirm: 'Sim, executar',
      action: () => handleStatusChange('em_progresso'),
    },
    reabrir_servico: {
      title: 'Reabrir Serviço',
      desc: 'Deseja reabrir este serviço para edição? O status voltará para Em Progresso.',
      confirm: 'Sim, reabrir',
      action: () => handleStatusChange('em_progresso'),
    },
    excluir: {
      title: 'Excluir Serviço',
      desc: 'Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.',
      confirm: 'Sim, excluir',
      action: handleDelete,
    },
  };

  const renderActionButtons = () => {
    switch (status) {
      case 'orcamento':
        return (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="secondary" onClick={() => generateImage('orcamento')} className="flex-1">
                <Download className="w-4 h-4 mr-2" /> Baixar Orçamento
              </Button>
              <Button onClick={() => onEdit(serviceId)} className="flex-1">
                <Pencil className="w-4 h-4 mr-2" /> Editar
              </Button>
              <Button onClick={() => setConfirmAction('executar_servico')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle className="w-4 h-4 mr-2" /> Executar Serviço
              </Button>
            </div>
            <Button variant="destructive" onClick={() => setConfirmAction('cancelar_orcamento')} className="w-full">
              Cancelar Orçamento
            </Button>
          </div>
        );
      case 'cancelado':
        return (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => generateImage('orcamento')} className="flex-1">
              <Download className="w-4 h-4 mr-2" /> Baixar Orçamento
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Fechar</Button>
            <Button onClick={() => setConfirmAction('reabrir_orcamento')} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
              <RotateCcw className="w-4 h-4 mr-2" /> Reabrir Orçamento
            </Button>
          </div>
        );
      case 'em_progresso':
        return (
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfirmAction('excluir')} className="border-destructive text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </Button>
              {isRapido && (
                <Button variant="secondary" onClick={() => setShowAssign(true)}>
                  <UserPlus className="w-4 h-4 mr-2" /> Atribuir Cliente
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onEdit(serviceId)}>
                <Pencil className="w-4 h-4 mr-2" /> Editar
              </Button>
              <Button onClick={() => onEdit(serviceId)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle className="w-4 h-4 mr-2" /> Finalizar Serviço
              </Button>
            </div>
          </div>
        );
      case 'finalizado':
        return (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => generateImage('recibo')} className="flex-1">
              <FileImage className="w-4 h-4 mr-2" /> Gerar Recibo
            </Button>
            <Button variant="outline" onClick={() => setConfirmAction('excluir')} className="flex-1 border-destructive text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
            <Button onClick={() => setConfirmAction('reabrir_servico')} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
              <RotateCcw className="w-4 h-4 mr-2" /> Reabrir Serviço
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Fechar</Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-popover border-border w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-primary">{service.id}</span>
              <StatusBadge status={status} />
              {showPaymentTag && <PaymentBadge status={service.status_pagamento} />}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Informações
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente</span><p className="text-foreground font-medium">{client?.nome || 'Não identificado'}</p></div>
                <div><span className="text-muted-foreground">Carro</span><p className="text-foreground font-medium">{carDisplay}</p></div>
                <div><span className="text-muted-foreground">Entrada</span><p className="text-foreground">{service.data_entrada ? new Date(service.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</p></div>
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
                {pneus.map((p, idx) =>
                  <div key={idx} className="flex justify-between text-sm text-foreground border-b border-border py-1.5 last:border-0">
                    <span>
                      {p.quantidade}x {p.estoque_pneus ? `${p.estoque_pneus.marca} ${p.estoque_pneus.medida_01}/${p.estoque_pneus.medida_02} ${p.estoque_pneus.aro}` : 'Pneu'}
                    </span>
                    <span>{formatCurrency(Number(p.valor_unitario) * Number(p.quantidade))}</span>
                  </div>
                )}
              </div>
            </>}

            {custos.length > 0 && <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5" /> Custos
                </h4>
                {custos.map((c, idx) =>
                  <div key={idx} className="flex justify-between text-sm text-foreground border-b border-border py-1.5 last:border-0">
                    <span>{c.item} {c.fornecedores?.nome ? <span className="text-muted-foreground">({c.fornecedores.nome})</span> : ''} <span className="text-muted-foreground">×{c.quantidade}</span></span>
                    <div className="flex items-center gap-2">
                      <span>{formatCurrency(Number(c.valor) * Number(c.quantidade))}</span>
                      {!c.data_compra && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Pendente</span>}
                    </div>
                  </div>
                )}
              </div>
            </>}

            {pagamentos.length > 0 && <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" /> Pagamentos
                </h4>
                {pagamentos.map((p, idx) =>
                  <div key={idx} className="flex justify-between text-sm text-foreground border-b border-border py-1.5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span>{p.tipo} {p.bandeiras?.nome ? `(${p.bandeiras.nome})` : ''} {p.parcelas ? `${p.parcelas}x` : ''}</span>
                      {p.data_pagamento && <span className="text-muted-foreground text-xs">{new Date(p.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${p.pago ? 'bg-status-entregue-bg text-emerald-500' : 'bg-status-aguardando-bg text-yellow-500'}`}>
                        {p.pago ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                    <span>{formatCurrency(Number(p.valor))} <span className="text-muted-foreground text-xs">({p.taxa_aplicada}%)</span></span>
                  </div>
                )}
              </div>
            </>}

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-lg p-3">
                <span className="text-xs text-muted-foreground">Total</span>
                <p className="text-lg font-semibold">{formatCurrency(Number(service.valor_total))}</p>
              </div>
              <div className="bg-card rounded-lg p-3">
                <span className="text-xs text-muted-foreground">Total - (% Taxas)</span>
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

            {renderActionButtons()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden receipt/quote for export */}
      <div ref={receiptRef} style={{ display: 'none', width: 540, padding: 40, fontFamily: 'Inter, sans-serif', color: '#FFFFFF', background: '#1A1A1A' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#F97316' }}>AV Tech</div>
          <div style={{ fontSize: 14, color: '#B0B0B0' }}>Auto Center · Itatiba-SP</div>
          {isOrcamento && <div style={{ fontSize: 18, fontWeight: 600, color: '#3B82F6', marginTop: 8 }}>ORÇAMENTO</div>}
        </div>
        <hr style={{ borderColor: '#3D3D3D', margin: '16px 0' }} />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: '#B0B0B0' }}>Cliente</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{client?.nome || 'Não identificado'}</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: '#B0B0B0' }}>Veículo</div>
          <div style={{ fontSize: 16 }}>{carDisplay}</div>
        </div>
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
          <div style={{ fontSize: 14, color: '#B0B0B0' }}>{isOrcamento ? 'Valor Estimado' : 'Valor Total'}</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#F97316' }}>{formatCurrency(Number(service.valor_total))}</div>
        </div>
        {pagamentos.length > 0 && !isOrcamento &&
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

      {/* Confirmation dialogs */}
      {confirmAction && confirmMessages[confirmAction] && (
        <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent className="bg-popover border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmMessages[confirmAction].title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmMessages[confirmAction].desc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Não, voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmMessages[confirmAction].action}
                className={confirmAction === 'excluir' || confirmAction === 'cancelar_orcamento' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              >
                {confirmMessages[confirmAction].confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {showAssign && (
        <AssignClientDialog
          open={showAssign}
          serviceId={serviceId}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { setShowAssign(false); load(); }}
        />
      )}
    </>
  );
}
