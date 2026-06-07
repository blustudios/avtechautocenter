import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

interface Fornecedor { id: string; nome: string }

interface Props {
  custoId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function EditCustoDialog({ custoId, open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [servicoId, setServicoId] = useState<string>('');
  const [servicoStatus, setServicoStatus] = useState<string>('');
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  const [item, setItem] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [fornecedorId, setFornecedorId] = useState('');
  const [valor, setValor] = useState('0');
  const [dataCompra, setDataCompra] = useState('');
  const [showDateField, setShowDateField] = useState(false);

  // snapshot for historico
  const [original, setOriginal] = useState<any>(null);

  useEffect(() => {
    if (!open || !custoId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [{ data: forns }, { data: c }] = await Promise.all([
        supabase.from('fornecedores').select('id, nome').order('nome'),
        supabase.from('servicos_custos').select('*').eq('id', custoId).maybeSingle(),
      ]);
      if (cancelled) return;
      setFornecedores((forns as any) || []);
      if (c) {
        setOriginal(c);
        setServicoId(c.servico_id);
        setItem(c.item || '');
        setQuantidade(String(c.quantidade ?? '1'));
        setFornecedorId(c.fornecedor_id || '');
        setValor(String(c.valor ?? '0'));
        setDataCompra(c.data_compra || '');
        setShowDateField(!!c.data_compra);

        const { data: srv } = await supabase.from('servicos').select('status').eq('id', c.servico_id).maybeSingle();
        if (!cancelled && srv) setServicoStatus(srv.status || '');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [custoId, open]);

  const qtdNum = parseFloat(quantidade) || 0;
  const valorNum = parseFloat(valor) || 0;
  const totalLinha = valorNum * (qtdNum || 1);
  const isOrcamento = servicoStatus === 'orcamento';

  const validate = (): string | null => {
    if (!item.trim()) return 'Informe o item.';
    if (qtdNum <= 0) return 'Quantidade deve ser maior que zero.';
    if (valorNum < 0) return 'Valor inválido.';
    if (!isOrcamento && !dataCompra) return 'Informe a data de compra.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!custoId) return;
    setSaving(true);
    try {
      const payload = {
        item: item.trim(),
        quantidade: qtdNum,
        fornecedor_id: fornecedorId || null,
        valor: valorNum,
        data_compra: dataCompra || null,
      };
      const { error: updErr } = await supabase.from('servicos_custos').update(payload).eq('id', custoId);
      if (updErr) throw updErr;

      // Recalcular custo_total e lucro_liquido do serviço
      const [{ data: allCustos }, { data: srv }] = await Promise.all([
        supabase.from('servicos_custos').select('valor, quantidade').eq('servico_id', servicoId),
        supabase.from('servicos').select('status, valor_liquido').eq('id', servicoId).maybeSingle(),
      ]);
      const custoTotal = (allCustos || []).reduce(
        (s: number, c: any) => s + (Number(c.valor) || 0) * (Number(c.quantidade) || 1),
        0,
      );
      if (srv && srv.status !== 'orcamento') {
        await supabase.from('servicos').update({
          custo_total: custoTotal,
          lucro_liquido: (Number(srv.valor_liquido) || 0) - custoTotal,
        }).eq('id', servicoId);
      } else if (srv) {
        await supabase.from('servicos').update({ custo_total: custoTotal }).eq('id', servicoId);
      }

      // Histórico — registrar campos alterados
      const fields: Array<[string, any, any]> = [
        ['item', original?.item, payload.item],
        ['quantidade', original?.quantidade, payload.quantidade],
        ['fornecedor_id', original?.fornecedor_id, payload.fornecedor_id],
        ['valor', original?.valor, payload.valor],
        ['data_compra', original?.data_compra, payload.data_compra],
      ];
      const changes = fields.filter(([, a, b]) => String(a ?? '') !== String(b ?? ''));
      if (changes.length) {
        await supabase.from('servicos_historico').insert(
          changes.map(([f, a, b]) => ({
            servico_id: servicoId,
            campo: `custo:${custoId.slice(0, 8)}:${f}`,
            valor_anterior: a == null ? null : String(a),
            valor_novo: b == null ? null : String(b),
          })),
        );
      }

      toast.success('Custo atualizado');
      onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error('Falha ao salvar: ' + (e?.message || 'erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar custo{servicoId ? ` — Serviço ${servicoId}` : ''}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Custo</h3>
            </div>

            <div className="bg-card border border-border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={item}
                  onChange={e => setItem(e.target.value)}
                  placeholder="Item"
                  className="bg-background border-border"
                />
                <Select value={fornecedorId || '__none__'} onValueChange={v => setFornecedorId(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem fornecedor</SelectItem>
                    {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className={`grid gap-2 ${isOrcamento ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <Input
                  type="number"
                  value={quantidade}
                  onChange={e => setQuantidade(e.target.value)}
                  placeholder="Qtd"
                  className="bg-background border-border"
                />
                <CurrencyInput value={valor} onChange={setValor} className="bg-background border-border" />
                {!isOrcamento && (
                  dataCompra || showDateField ? (
                    <Input
                      type="date"
                      value={dataCompra}
                      onChange={e => {
                        setDataCompra(e.target.value);
                        if (!e.target.value) setShowDateField(false);
                      }}
                      className="bg-background border-border"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDateField(true)}
                      className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                    >
                      + data de compra
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="rounded-md bg-muted/40 p-3 text-xs flex justify-between">
              <span className="text-muted-foreground">Total da linha</span>
              <span className="font-medium text-destructive">{formatCurrency(totalLinha)}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
