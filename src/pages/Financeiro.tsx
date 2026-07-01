import { Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthProvider } from '@/contexts/MonthContext';
import { MonthSelector } from '@/components/financeiro/MonthSelector';
import { NotificationsBell } from '@/components/financeiro/NotificationsBell';
import { TabLancamentos } from '@/components/financeiro/TabLancamentos';
import { TabResumo } from '@/components/financeiro/TabResumo';
import { TabCaixa } from '@/components/financeiro/TabCaixa';
import { TabEstoquePneus } from '@/components/financeiro/TabEstoquePneus';

export default function Financeiro() {
  return (
    <MonthProvider>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          </div>
          <div className="flex items-center gap-2">
            <MonthSelector />
            <NotificationsBell />
          </div>
        </div>

        <Tabs defaultValue="lancamentos" className="w-full">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="caixa">Caixa</TabsTrigger>
            <TabsTrigger value="estoque-pneus">Estoque de Pneus</TabsTrigger>
          </TabsList>
          <TabsContent value="lancamentos" className="mt-4"><TabLancamentos /></TabsContent>
          <TabsContent value="resumo" className="mt-4"><TabResumo /></TabsContent>
          <TabsContent value="caixa" className="mt-4"><TabCaixa /></TabsContent>
          <TabsContent value="estoque-pneus" className="mt-4"><TabEstoquePneus /></TabsContent>
        </Tabs>
      </div>
    </MonthProvider>
  );
}
