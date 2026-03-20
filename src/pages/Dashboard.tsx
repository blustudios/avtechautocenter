import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wrench, Car, Calculator, CreditCard } from 'lucide-react';

export default function Dashboard() {
  const [servicos, setServicos] = useState<any[]>([]);
  const [prevServicos, setPrevServicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startCurrent = new Date(year, month, 1).toISOString().split('T')[0];
    const endCurrent = new Date(year, month + 1, 0).toISOString().split('T')[0];
    const startPrev = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endPrev = new Date(year, month, 0).toISOString().split('T')[0];

    Promise.all([
      supabase.from('servicos').select('*').gte('data_entrada', startCurrent).lte('data_entrada', endCurrent),
      supabase.from('servicos').select('*').gte('data_entrada', startPrev).lte('data_entrada', endPrev),
    ]).then(([curr, prev]) => {
      setServicos(curr.data || []);
      setPrevServicos(prev.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center text-muted-foreground py-12">Carregando...</div>;

  const faturamento = servicos.reduce((s, v) => s + Number(v.valor_total), 0);
  const lucro = servicos.reduce((s, v) => s + Number(v.lucro_liquido), 0);
  const numServicos = servicos.length;
  const ticketMedio = numServicos > 0 ? faturamento / numServicos : 0;

  // Working days (Mon-Sat) in current month
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), d).getDay();
    if (day >= 1 && day <= 6) workingDays++;
  }

  const mediaCarrosDia = workingDays > 0 ? numServicos / workingDays : 0;
  const mediaFatDia = workingDays > 0 ? faturamento / workingDays : 0;
  const contasReceber = servicos.filter(s => s.status_pagamento === 'pendente' || s.status_pagamento === 'parcial').reduce((s, v) => s + Number(v.valor_total), 0);

  const prevFat = prevServicos.reduce((s, v) => s + Number(v.valor_total), 0);
  const fatChange = prevFat > 0 ? ((faturamento - prevFat) / prevFat * 100) : 0;

  // Bar chart data
  const barData: { day: number; valor: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const total = servicos.filter(s => s.data_entrada === dateStr).reduce((s, v) => s + Number(v.valor_total), 0);
    barData.push({ day: d, valor: total });
  }

  // Status donut
  const statusCounts = [
    { name: 'À Iniciar', value: servicos.filter(s => s.status === 'a_iniciar').length, color: '#B0B0B0' },
    { name: 'Em Progresso', value: servicos.filter(s => s.status === 'em_progresso').length, color: '#60A5FA' },
    { name: 'Aguardando Peça', value: servicos.filter(s => s.status === 'aguardando_peca').length, color: '#FBBF24' },
    { name: 'Entregue', value: servicos.filter(s => s.status === 'entregue').length, color: '#4ADE80' },
  ].filter(s => s.value > 0);

  // Payment donut
  const paymentCounts = [
    { name: 'Pago', value: servicos.filter(s => s.status_pagamento === 'pago').length, color: '#4ADE80' },
    { name: 'Pendente', value: servicos.filter(s => s.status_pagamento === 'pendente').length, color: '#FBBF24' },
    { name: 'Parcial', value: servicos.filter(s => s.status_pagamento === 'parcial').length, color: '#F97316' },
  ].filter(s => s.value > 0);

  const metrics = [
    { label: 'Faturamento', value: formatCurrency(faturamento), icon: DollarSign },
    { label: 'Lucro Líquido', value: formatCurrency(lucro), icon: TrendingUp },
    { label: 'Serviços', value: String(numServicos), icon: Wrench },
    { label: 'Ticket Médio', value: formatCurrency(ticketMedio), icon: Calculator },
    { label: 'Média Carros/Dia', value: mediaCarrosDia.toFixed(1), icon: Car },
    { label: 'Média Fat./Dia', value: formatCurrency(mediaFatDia), icon: DollarSign },
    { label: 'Contas a Receber', value: formatCurrency(contasReceber), icon: CreditCard },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Comparison card */}
      <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
        <div>
          <span className="text-sm text-muted-foreground">vs. Mês Anterior</span>
          <div className="flex items-center gap-2 mt-1">
            {fatChange >= 0 ? <TrendingUp className="w-5 h-5 text-status-entregue" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
            <span className={`text-xl font-bold ${fatChange >= 0 ? 'text-status-entregue' : 'text-destructive'}`}>
              {fatChange >= 0 ? '+' : ''}{fatChange.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Anterior: {formatCurrency(prevFat)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Faturamento por Dia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <XAxis dataKey="day" tick={{ fill: '#B0B0B0', fontSize: 11 }} />
              <YAxis tick={{ fill: '#B0B0B0', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#2E2E2E', border: '1px solid #3D3D3D', borderRadius: 8, color: '#fff' }}
                formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="valor" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status donut */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Serviços por Status</h3>
          {statusCounts.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={statusCounts} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {statusCounts.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusCounts.map(s => (
                  <div key={s.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                    <span className="text-foreground">{s.name}: {s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-muted-foreground text-sm">Sem dados</p>}
        </div>

        {/* Payment donut */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Pagamentos</h3>
          {paymentCounts.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={paymentCounts} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {paymentCounts.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {paymentCounts.map(s => (
                  <div key={s.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                    <span className="text-foreground">{s.name}: {s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-muted-foreground text-sm">Sem dados</p>}
        </div>
      </div>
    </div>
  );
}
