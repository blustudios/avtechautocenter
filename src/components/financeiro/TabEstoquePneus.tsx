import { Wallet, Package, TrendingDown, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useMonth } from '@/contexts/MonthContext';
import { formatCurrency } from '@/lib/format';
import { useEstoqueTotais, useVendasPneusMes } from '@/hooks/financeiro/useEstoquePneusData';

const chartConfig = {
  quantidade: { label: 'Pneus vendidos', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

function Kpi({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  loading?: boolean;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${accent ?? 'bg-primary/10 text-primary'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-32 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-foreground truncate">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const TIPO_ORDER = ['Remold', 'Importado', '1ª Linha'] as const;
const TIPO_COLOR: Record<string, string> = {
  'Remold': 'text-amber-400',
  'Importado': 'text-sky-400',
  '1ª Linha': 'text-emerald-400',
};

function VendidosCard({
  total,
  porTipo,
  loading,
}: {
  total: number;
  porTipo: Record<string, number>;
  loading?: boolean;
}) {
  const tipos = TIPO_ORDER.filter(t => (porTipo[t] || 0) > 0);
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-4">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-400 shrink-0">
          <TrendingDown className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pneus vendidos no mês</p>
          {loading ? (
            <Skeleton className="h-7 w-32 mt-1" />
          ) : (
            <>
              <p className="text-2xl font-bold text-foreground truncate">{total}</p>
              {total > 0 && tipos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tipos.map(t => (
                    <div
                      key={t}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-xs"
                    >
                      <span className="text-muted-foreground">{t}</span>
                      <span className={`font-semibold ${TIPO_COLOR[t] || 'text-foreground'}`}>
                        {porTipo[t]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TabEstoquePneus() {
  const { month } = useMonth();
  const totais = useEstoqueTotais();
  const vendas = useVendasPneusMes(month);

  const temVendas = (vendas.data?.porDia || []).some(d => d.quantidade > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <Kpi
          icon={Wallet}
          label="Valor médio em estoque"
          value={formatCurrency(totais.data?.valorTotal || 0)}
          loading={totais.isLoading}
        />
        <Kpi
          icon={Package}
          label="Pneus em estoque"
          value={String(totais.data?.qtdTotal ?? 0)}
          loading={totais.isLoading}
          accent="bg-blue-500/10 text-blue-400"
        />
        <VendidosCard
          total={vendas.data?.totalMes ?? 0}
          porTipo={vendas.data?.porTipo || {}}
          loading={vendas.isLoading}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Pneus vendidos por dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendas.isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : !temVendas ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              Sem vendas registradas neste mês.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[260px] w-full aspect-auto">
              <BarChart data={vendas.data?.porDia || []} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={28}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideIndicator={false}
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as { data?: string } | undefined;
                        if (!p?.data) return '';
                        const [y, m, d] = p.data.split('-');
                        return `${d}/${m}/${y}`;
                      }}
                    />
                  }
                />
                <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
