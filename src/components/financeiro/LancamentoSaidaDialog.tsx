import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useCategorias, useOrigens, Lancamento } from '@/hooks/financeiro/useFinanceiroData';
import { useMonth } from '@/contexts/MonthContext';
import { expandRecurrence, Frequencia } from '@/lib/financeiro/recurrence';
import { startOfMonth, parseISO, format, addMonths } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  edit?: Lancamento | null;
  initial?: Lancamento | null;
}

export function LancamentoSaidaDialog({ open, onOpenChange, edit, initial }: Props) {
  const qc = useQueryClient();
  const { month } = useMonth();
  const { data: categorias } = useCategorias();
  const { data: origens } = useOrigens();

  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [titulo, setTitulo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [origemId, setOrigemId] = useState<string>('');
  const [valorPrevisto, setValorPrevisto] = useState('0');
  const [valorRealizado, setValorRealizado] = useState('0');
  const [status, setStatus] = useState<'a_pagar' | 'agendado' | 'pago'>('a_pagar');
  const [recorrente, setRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState<Frequencia>('mensal');
  const [dataFim, setDataFim] = useState('');
  const [parcelado, setParcelado] = useState(false);
  const [parcelaAtual, setParcelaAtual] = useState(1);
  const [parcelaTotal, setParcelaTotal] = useState(2);
  const [faturado, setFaturado] = useState(false);
  const [faturas, setFaturas] = useState<{ data: string; valor: string }[]>([
    { data: format(new Date(), 'yyyy-MM-dd'), valor: '0' },
  ]);
  const [saving, setSaving] = useState(false);

  // Fluxo de confirmação do parcelado
  const [askFuturas, setAskFuturas] = useState(false);
  const [askAnteriores, setAskAnteriores] = useState(false);
  const pendingChoicesRef = (globalThis as any);
  const [choiceFuturas, setChoiceFuturas] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setData(edit.data);
      setCategoriaId(edit.categoria_id || '');
      setTitulo(edit.descricao);
      setObservacoes((edit as any).observacoes || '');
      setOrigemId(edit.origem_id || '');
      setValorPrevisto(String(edit.valor_previsto));
      setValorRealizado(String(edit.valor_realizado));
      setStatus((edit.status_pagamento as any) || 'a_pagar');
      setRecorrente(false);
      setDataFim('');
      const pt = (edit as any).parcela_total;
      const pa = (edit as any).parcela_atual;
      setParcelado(!!pt);
      setParcelaAtual(pa || 1);
      setParcelaTotal(pt || 2);
      setFaturado(false);
      setFaturas([{ data: format(new Date(), 'yyyy-MM-dd'), valor: '0' }]);
    } else if (initial) {
      setData(initial.data);
      setCategoriaId(initial.categoria_id || '');
      setTitulo(initial.descricao);
      setObservacoes((initial as any).observacoes || '');
      setOrigemId(initial.origem_id || '');
      setValorPrevisto(String(initial.valor_previsto));
      setValorRealizado(String(initial.valor_realizado));
      setStatus((initial.status_pagamento as any) || 'a_pagar');
      setRecorrente(false);
      setFrequencia('mensal');
      setDataFim('');
      setParcelado(false);
      setParcelaAtual(1);
      setParcelaTotal(2);
    } else {
      setData(format(month, 'yyyy-MM-dd'));
      setCategoriaId('');
      setTitulo('');
      setObservacoes('');
      setOrigemId('');
      setValorPrevisto('0');
      setValorRealizado('0');
      setStatus('a_pagar');
      setRecorrente(false);
      setFrequencia('mensal');
      setDataFim('');
      setParcelado(false);
      setParcelaAtual(1);
      setParcelaTotal(2);
    }
  }, [open, edit, initial, month]);

  const catsDisponiveis = (categorias || []).filter(c => c.nome !== 'Custos de Serviço');
  const origensSaida = (origens || []).filter(o => o.tipo === 'saida');

  const buildBase = () => ({
    tipo: 'saida' as const,
    descricao: titulo.trim(),
    observacoes: observacoes.trim() || null,
    categoria_id: categoriaId || null,
    origem_id: origemId || null,
    is_auto: false,
  });

  const validate = () => {
    if (!titulo.trim()) { toast.error('Título obrigatório'); return false; }
    if (!data) { toast.error('Data obrigatória'); return false; }
    if (recorrente && !dataFim) { toast.error('Data final da recorrência obrigatória'); return false; }
    if (parcelado) {
      if (!parcelaTotal || parcelaTotal < 2) { toast.error('Parcelas Totais deve ser ≥ 2'); return false; }
      if (!parcelaAtual || parcelaAtual < 1 || parcelaAtual > parcelaTotal) {
        toast.error('Parcela Atual inválida'); return false;
      }
    }
    return true;
  };

  const saveSimple = async () => {
    const { error } = await supabase.from('financeiro_lancamentos').insert({
      ...buildBase(),
      data,
      valor_previsto: parseFloat(valorPrevisto) || 0,
      valor_realizado: parseFloat(valorRealizado) || 0,
      status_pagamento: status,
      mes_referencia: format(startOfMonth(parseISO(data)), 'yyyy-MM-dd'),
    });
    if (error) throw error;
    toast.success('Saída registrada');
  };

  const saveRecorrente = async () => {
    const { data: rec, error: recErr } = await supabase.from('financeiro_recorrencias').insert({
      frequencia, data_inicio: data, data_fim: dataFim,
    }).select().single();
    if (recErr) throw recErr;
    const datas = expandRecurrence(data, dataFim, frequencia);
    const rows = datas.map(d => ({
      ...buildBase(),
      data: d,
      valor_previsto: parseFloat(valorPrevisto) || 0,
      valor_realizado: 0,
      status_pagamento: 'a_pagar' as const,
      recorrencia_id: rec.id,
      mes_referencia: format(startOfMonth(parseISO(d)), 'yyyy-MM-dd'),
    }));
    const { error } = await supabase.from('financeiro_lancamentos').insert(rows);
    if (error) throw error;
    toast.success(`${rows.length} lançamentos criados`);
  };

  const saveParcelado = async (incluirFuturas: boolean, incluirAnteriores: boolean) => {
    const grupoId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    const baseDate = parseISO(data);
    const vp = parseFloat(valorPrevisto) || 0;
    const vr = parseFloat(valorRealizado) || 0;

    const rows: any[] = [];

    // Parcela atual
    rows.push({
      ...buildBase(),
      data,
      valor_previsto: vp,
      valor_realizado: vr,
      status_pagamento: status,
      mes_referencia: format(startOfMonth(baseDate), 'yyyy-MM-dd'),
      parcela_atual: parcelaAtual,
      parcela_total: parcelaTotal,
      parcela_grupo_id: grupoId,
    });

    if (incluirAnteriores && parcelaAtual > 1) {
      for (let i = 1; i < parcelaAtual; i++) {
        const offset = parcelaAtual - i; // i=1 → offset maior (mais antigo)
        const d = addMonths(baseDate, -offset);
        rows.push({
          ...buildBase(),
          data: format(d, 'yyyy-MM-dd'),
          valor_previsto: vp,
          valor_realizado: vp,
          status_pagamento: 'pago' as const,
          mes_referencia: format(startOfMonth(d), 'yyyy-MM-dd'),
          parcela_atual: i,
          parcela_total: parcelaTotal,
          parcela_grupo_id: grupoId,
        });
      }
    }

    if (incluirFuturas && parcelaAtual < parcelaTotal) {
      for (let i = parcelaAtual + 1; i <= parcelaTotal; i++) {
        const offset = i - parcelaAtual;
        const d = addMonths(baseDate, offset);
        rows.push({
          ...buildBase(),
          data: format(d, 'yyyy-MM-dd'),
          valor_previsto: vp,
          valor_realizado: 0,
          status_pagamento: 'a_pagar' as const,
          mes_referencia: format(startOfMonth(d), 'yyyy-MM-dd'),
          parcela_atual: i,
          parcela_total: parcelaTotal,
          parcela_grupo_id: grupoId,
        });
      }
    }

    const { error } = await supabase.from('financeiro_lancamentos').insert(rows);
    if (error) throw error;
    toast.success(`${rows.length} parcela(s) criada(s)`);
  };

  const finalizeSave = async () => {
    setSaving(true);
    try {
      if (edit) {
        const { error } = await supabase.from('financeiro_lancamentos').update({
          data,
          descricao: titulo.trim(),
          observacoes: observacoes.trim() || null,
          categoria_id: categoriaId || null,
          origem_id: origemId || null,
          valor_previsto: parseFloat(valorPrevisto) || 0,
          valor_realizado: parseFloat(valorRealizado) || 0,
          status_pagamento: status,
          mes_referencia: format(startOfMonth(parseISO(data)), 'yyyy-MM-dd'),
        }).eq('id', edit.id);
        if (error) throw error;
        toast.success('Saída atualizada');
      } else if (parcelado) {
        // já tratado no fluxo de confirmação
      } else if (recorrente) {
        await saveRecorrente();
      } else {
        await saveSimple();
      }
      qc.invalidateQueries({ queryKey: ['fin'] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!validate()) return;
    if (!edit && parcelado) {
      // Inicia o fluxo de confirmações
      setAskFuturas(parcelaAtual < parcelaTotal);
      // Se não há parcela futura, pula direto para anteriores (se houver)
      if (parcelaAtual >= parcelaTotal) {
        if (parcelaAtual > 1) setAskAnteriores(true);
        else handleParceladoFinal(false, false);
      }
      return;
    }
    finalizeSave();
  };

  const handleParceladoFinal = async (incluirFuturas: boolean, incluirAnteriores: boolean) => {
    setSaving(true);
    try {
      await saveParcelado(incluirFuturas, incluirAnteriores);
      qc.invalidateQueries({ queryKey: ['fin'] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
      setAskFuturas(false);
      setAskAnteriores(false);
      setChoiceFuturas(null);
    }
  };

  const onAnswerFuturas = (yes: boolean) => {
    setAskFuturas(false);
    setChoiceFuturas(yes);
    if (parcelaAtual > 1) {
      setAskAnteriores(true);
    } else {
      handleParceladoFinal(yes, false);
    }
  };

  const onAnswerAnteriores = (yes: boolean) => {
    setAskAnteriores(false);
    handleParceladoFinal(choiceFuturas ?? false, yes);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-popover border-border">
          <DialogHeader>
            <DialogTitle>{edit ? 'Editar Saída' : 'Nova Saída'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded p-2">
              Custos já lançados dentro de um Serviço não devem ser cadastrados aqui — eles entram automaticamente na linha "Custos de Serviço".
            </p>
            <div>
              <Label>Data da saída</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} className="bg-card border-border" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {catsDisponiveis.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                maxLength={80}
                placeholder="Nome exibido na lista"
                className="bg-card border-border"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={3}
                placeholder="Detalhes adicionais (opcional)"
                className="bg-card border-border"
              />
            </div>
            <div>
              <Label>Origem da saída</Label>
              <Select value={origemId} onValueChange={setOrigemId}>
                <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {origensSaida.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor Previsto</Label>
                <CurrencyInput value={valorPrevisto} onChange={setValorPrevisto} />
              </div>
              <div>
                <Label>Valor Realizado</Label>
                <CurrencyInput value={valorRealizado} onChange={setValorRealizado} />
              </div>
            </div>
            <div>
              <Label>Status de Pagamento</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_pagar">A pagar</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!edit && (
              <>
                <div className="border border-border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="parc"
                      checked={parcelado}
                      onCheckedChange={v => { setParcelado(!!v); if (v) setRecorrente(false); }}
                    />
                    <Label htmlFor="parc" className="cursor-pointer">Parcelado</Label>
                  </div>
                  {parcelado && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Parcela Atual</Label>
                        <Input
                          type="number" min={1} max={parcelaTotal}
                          value={parcelaAtual}
                          onChange={e => setParcelaAtual(Math.max(1, parseInt(e.target.value) || 1))}
                          className="bg-card border-border"
                        />
                      </div>
                      <div>
                        <Label>Parcelas Totais</Label>
                        <Input
                          type="number" min={2}
                          value={parcelaTotal}
                          onChange={e => setParcelaTotal(Math.max(2, parseInt(e.target.value) || 2))}
                          className="bg-card border-border"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rec"
                      checked={recorrente}
                      disabled={parcelado}
                      onCheckedChange={v => setRecorrente(!!v)}
                    />
                    <Label htmlFor="rec" className={`cursor-pointer ${parcelado ? 'opacity-50' : ''}`}>
                      Recorrência
                    </Label>
                  </div>
                  {recorrente && !parcelado && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Frequência</Label>
                        <Select value={frequencia} onValueChange={(v: any) => setFrequencia(v)}>
                          <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="semanal">Semanal</SelectItem>
                            <SelectItem value="mensal">Mensal</SelectItem>
                            <SelectItem value="anual">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Data final</Label>
                        <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-card border-border" />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSaveClick} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? 'Salvando...' : 'Salvar Saída'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação: replicar parcelas futuras */}
      <AlertDialog open={askFuturas} onOpenChange={setAskFuturas}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replicar parcelas futuras?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja replicar essa saída nos meses seguintes até a última parcela
              ({parcelaAtual + 1} de {parcelaTotal} … {parcelaTotal} de {parcelaTotal})?
              As parcelas futuras serão criadas com status "A pagar".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onAnswerFuturas(false)}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => onAnswerFuturas(true)}>Sim, replicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação: adicionar parcelas anteriores */}
      <AlertDialog open={askAnteriores} onOpenChange={setAskAnteriores}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar parcelas anteriores?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja adicionar as parcelas anteriores (1 de {parcelaTotal} … {parcelaAtual - 1} de {parcelaTotal})
              nos meses anteriores com status "Pago"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onAnswerAnteriores(false)}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => onAnswerAnteriores(true)}>Sim, adicionar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
