import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  MessageCircle, 
  Users, 
  Scale,
  ArrowRight
} from 'lucide-react';

const actions = [
  {
    title: 'Consultoria e Requerimentos',
    description: 'Acesso direto à equipe',
    icon: Users,
    page: 'Requests',
    color: 'from-teal-500 to-teal-600'
  },
  {
    title: 'Chat IA Rute',
    description: 'Tire suas dúvidas',
    icon: MessageCircle,
    page: 'ChatRute',
    color: 'from-amber-500 to-amber-600'
  },
  {
    title: 'Documentos',
    description: 'Gerencie seus documentos',
    icon: FileText,
    page: 'DocumentsHub',
    color: 'from-emerald-500 to-emerald-600'
  },
  {
    title: 'Processos',
    description: 'Acompanhe processos',
    icon: Scale,
    page: 'Processes',
    color: 'from-blue-500 to-blue-600'
  },
];

export default function QuickActions({ userType }) {
  const visibleActions = actions.filter(a => {
    if (a.page === 'Requests' && ['consultor', 'equipe', 'client_consultor'].includes(userType)) return false;
    return true;
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {visibleActions.map((action, index) => (
        <Link 
          key={index} 
          to={createPageUrl(action.page)}
          className="transform transition-all duration-300 hover:-translate-y-2"
        >
          <Card className="group hover:shadow-2xl hover:shadow-emerald-500/15 transition-all duration-300 border-emerald-100 hover:border-emerald-300 h-full bg-gradient-to-br from-white to-emerald-50/30 hover:from-emerald-50/50 hover:to-emerald-50/50">
            <CardContent className="p-5 lg:p-6">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-125 group-hover:shadow-xl transition-all duration-300`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors text-sm lg:text-base">{action.title}</h3>
              <p className="text-xs lg:text-sm text-gray-500 mt-1">{action.description}</p>
              <div className="flex items-center gap-1 mt-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <span className="text-xs font-medium">Acessar</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}