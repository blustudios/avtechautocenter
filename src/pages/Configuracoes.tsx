import { useNavigate } from 'react-router-dom';
import { Settings, CreditCard, Car, ChevronRight, Bell, DollarSign, Circle } from 'lucide-react';

const items = [
  {
    title: 'Geral',
    description: 'Avisos e preferências gerais do sistema.',
    icon: Bell,
    path: '/configuracoes/geral',
  },
  {
    title: 'Maquininhas',
    description: 'Cadastre maquininhas, bandeiras e taxas. Ative/desative para controlar quais aparecem nos pagamentos.',
    icon: CreditCard,
    path: '/configuracoes/maquininhas',
  },
  {
    title: 'Marcas e Modelos',
    description: 'Gerencie o catálogo de marcas e modelos de veículos usado no autocomplete.',
    icon: Car,
    path: '/configuracoes/marcas-modelos',
  },
  {
    title: 'Marcas de Pneus',
    description: 'Cadastre e edite as marcas usadas no estoque de pneus.',
    icon: Circle,
    path: '/configuracoes/marcas-pneus',
  },
  {
    title: 'Financeiro',
    description: 'Gerencie categorias de saída e origens de pagamento usadas no Controle Financeiro.',
    icon: DollarSign,
    path: '/configuracoes/financeiro',
  },
];

export default function Configuracoes() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="group bg-card border border-border rounded-lg p-5 text-left hover:border-primary/50 hover:bg-card/80 transition-colors flex items-start gap-4"
            >
              <div className="bg-primary/10 text-primary rounded-lg p-3 shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-foreground">{item.title}</h2>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
