import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Certifications() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  const { data: certifications = [] } = useQuery({
    queryKey: ['certifications', user?.email],
    queryFn: () => base44.entities.Certification.filter({ applicant_email: user.email }, '-application_date', 100),
    enabled: !!user?.email
  });

  const certTypes = [
    {
      name: 'Orgânica',
      description: 'Certifica que o produto foi produzido sem agrotóxicos',
      benefit: 'Aumento de 30-50% no valor de mercado'
    },
    {
      name: 'Carbono Neutro',
      description: 'Comprova compensação total das emissões de carbono',
      benefit: 'Acesso a mercados premium e créditos ESG'
    },
    {
      name: 'Fair Trade',
      description: 'Garante comércio justo e condições dignas de trabalho',
      benefit: 'Preço mínimo garantido e acesso a mercados internacionais'
    },
    {
      name: 'Rainforest Alliance',
      description: 'Sustentabilidade ambiental e social',
      benefit: 'Reconhecimento internacional'
    }
  ];

  const statusColors = {
    'Em Solicitação': 'bg-yellow-100 text-yellow-800',
    'Em Auditoria': 'bg-blue-100 text-blue-800',
    'Certificado': 'bg-green-100 text-green-800',
    'Renovada': 'bg-emerald-100 text-emerald-800',
    'Expirada': 'bg-red-100 text-red-800',
    'Suspensa': 'bg-orange-100 text-orange-800',
    'Rejeitada': 'bg-gray-100 text-gray-800'
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-600" />
            Certificações
          </h1>
          <p className="text-gray-600 mt-1">Certificação de produtos sustentáveis</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4 mr-2" />
          Solicitar Certificação
        </Button>
      </div>

      {/* Available Certifications */}
      <Card>
        <CardHeader>
          <CardTitle>Certificações Disponíveis</CardTitle>
          <CardDescription>Selos que valorizam seus produtos no mercado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certTypes.map((cert, idx) => (
              <Card key={idx} className="border-amber-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{cert.name}</CardTitle>
                      <CardDescription className="mt-1">{cert.description}</CardDescription>
                    </div>
                    <Award className="w-6 h-6 text-amber-600 shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-amber-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-amber-900">💰 {cert.benefit}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Certifications */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Certificações</CardTitle>
        </CardHeader>
        <CardContent>
          {certifications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Nenhuma certificação ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {certifications.map(cert => (
                <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{cert.certification_type}</h3>
                      <Badge className={statusColors[cert.status]}>{cert.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Produto: {cert.product} • {format(new Date(cert.application_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}