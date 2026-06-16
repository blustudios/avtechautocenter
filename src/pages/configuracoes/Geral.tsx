import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ArrowLeft, Settings, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const CHAVE = 'aviso_cadastro_cliente';

export default function ConfigGeral() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [habilitado, setHabilitado] = useState(true);
  const [valorMinimo, setValorMinimo] = useState('500.00');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('configuracoes_app')
        .select('valor')
        .eq('chave', CHAVE)
        .maybeSingle();
      if (data?.valor) {
        const v = data.valor as { habilitado?: boolean; valor_minimo?: number };
        setHabilitado(v.habilitado ?? true);
        setValorMinimo(((v.valor_minimo ?? 500)).toFixed(2));
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const valor = {
      habilitado,
      valor_minimo: parseFloat(valorMinimo) || 0,
    };
    const { error } = await supabase
      .from('configuracoes_app')
      .upsert({ chave: CHAVE, valor, updated_at: new Date().toISOString() }, { onConflict: 'chave' });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar configuração');
    } else {
      toast.success('Configuração salva');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/configuracoes')} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Geral</h1>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 space-y-4 max-w-xl">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Aviso de Cadastro de Cliente</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Quando ativado, exibe um lembrete ao abrir um serviço sem cliente atribuído cujo valor
          ultrapasse o limite definido abaixo.
        </p>

        <div className="flex items-center justify-between gap-4 pt-2">
          <Label htmlFor="aviso-toggle" className="text-foreground cursor-pointer">
            Habilitar aviso
          </Label>
          <Switch
            id="aviso-toggle"
            checked={habilitado}
            onCheckedChange={setHabilitado}
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="valor-minimo" className="text-foreground">
            Valor mínimo para disparar o aviso
          </Label>
          <CurrencyInput
            value={valorMinimo}
            onChange={setValorMinimo}
            readOnly={loading || !habilitado}
            className={!habilitado ? 'opacity-50' : ''}
          />
          <p className="text-xs text-muted-foreground">
            O aviso aparece quando o valor total do serviço for maior que este valor.
          </p>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
