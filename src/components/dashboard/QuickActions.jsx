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

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <Link key={index} to={createPageUrl(action.page)}>
          <Card className="group hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 border-emerald-100 hover:border-emerald-200 h-full">
            <CardContent className="p-5">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">{action.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{action.description}</p>
              <ArrowRight className="w-4 h-4 text-emerald-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}