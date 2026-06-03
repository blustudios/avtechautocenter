import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Receipt, ChevronRight } from 'lucide-react';

const categorias = [
  {
    to: '/relatorios/custos',
    icon: Receipt,
    title: 'Custos',
    description: 'Lista detalhada de todos os custos lançados nos serviços, com filtros e somatório.',
  },
];

export default function Relatorios() {
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Escolha uma categoria para visualizar.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categorias.map((c) => (
          <Link key={c.to} to={c.to} className="group">
            <Card className="h-full transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <c.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-1">
                    {c.title}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs leading-relaxed">{c.description}</CardDescription>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
