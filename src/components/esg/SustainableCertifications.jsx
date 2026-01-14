import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function SustainableCertifications() {
  const certifications = [
    {
      name: 'Orgânico Brasil',
      category: 'Produção Orgânica',
      description: 'Certificação oficial brasileira para produtos orgânicos, atestando que a produção segue práticas sustentáveis sem uso de agrotóxicos ou fertilizantes sintéticos.',
      benefits: [
        'Produtos podem usar o selo SisOrg',
        'Valorização de 30-50% no preço',
        'Acesso a mercados premium',
        'Isenção de algumas taxas'
      ],
      requirements: [
        'Período de conversão de 12-36 meses',
        'Auditorias anuais',
        'Rastreabilidade completa',
        'Plano de manejo orgânico'
      ],
      cost: 'R$ 3.000 - R$ 15.000 por ano',
      duration: '12 meses',
      certifier: 'IBD, Ecocert, IMO',
      status: 'Disponível'
    },
    {
      name: 'Carbono Neutro',
      category: 'Compensação de Carbono',
      description: 'Certificação que atesta que a produção compensa 100% das emissões de gases de efeito estufa através de projetos de sequestro ou redução de carbono.',
      benefits: [
        'Selo de produto carbono neutro',
        'Diferenciação no mercado',
        'Acesso a programas de incentivo',
        'Valorização de marca'
      ],
      requirements: [
        'Inventário de emissões certificado',
        'Projetos de compensação validados',
        'Monitoramento anual',
        'Relatório público de sustentabilidade'
      ],
      cost: 'R$ 5.000 - R$ 25.000 por ano',
      duration: '6-12 meses',
      certifier: 'Verra, Gold Standard, Imaflora',
      status: 'Disponível'
    },
    {
      name: 'Fair Trade (Comércio Justo)',
      category: 'Responsabilidade Social',
      description: 'Certificação internacional que garante práticas justas de comércio, condições dignas de trabalho e desenvolvimento sustentável das comunidades.',
      benefits: [
        'Selo Fair Trade reconhecido mundialmente',
        'Preço mínimo garantido',
        'Prêmio adicional para investimento social',
        'Acesso a mercado internacional'
      ],
      requirements: [
        'Organização democrática de produtores',
        'Boas condições de trabalho',
        'Práticas ambientalmente sustentáveis',
        'Transparência financeira'
      ],
      cost: 'R$ 8.000 - R$ 30.000 por ano',
      duration: '12-18 meses',
      certifier: 'FLO-CERT, Fairtrade International',
      status: 'Disponível'
    },
    {
      name: 'Rainforest Alliance',
      category: 'Sustentabilidade Integral',
      description: 'Certificação focada em agricultura sustentável, conservação da biodiversidade, melhoria de condições de vida e proteção de recursos naturais.',
      benefits: [
        'Selo verde reconhecido internacionalmente',
        'Acesso facilitado a compradores',
        'Treinamento e assistência técnica',
        'Melhoria contínua da produção'
      ],
      requirements: [
        'Práticas agrícolas sustentáveis',
        'Proteção de ecossistemas',
        'Bem-estar dos trabalhadores',
        'Gestão empresarial responsável'
      ],
      cost: 'R$ 4.000 - R$ 20.000 por ano',
      duration: '12 meses',
      certifier: 'Rainforest Alliance',
      status: 'Disponível'
    },
    {
      name: 'GlobalG.A.P.',
      category: 'Boas Práticas Agrícolas',
      description: 'Certificação internacional de boas práticas agrícolas, focada em segurança alimentar, sustentabilidade e rastreabilidade.',
      benefits: [
        'Acesso a supermercados internacionais',
        'Maior rastreabilidade',
        'Redução de riscos',
        'Melhoria de processos'
      ],
      requirements: [
        'Sistema de gestão de qualidade',
        'Uso responsável de agroquímicos',
        'Bem-estar animal (se aplicável)',
        'Gestão de resíduos'
      ],
      cost: 'R$ 6.000 - R$ 18.000 por ano',
      duration: '9-12 meses',
      certifier: 'NSF, SGS, Bureau Veritas',
      status: 'Em aprovação'
    },
    {
      name: 'Produto Sustentável Certificado',
      category: 'Sustentabilidade Geral',
      description: 'Certificação nacional que atesta práticas sustentáveis na produção, processamento e comercialização de produtos agrícolas.',
      benefits: [
        'Selo de credibilidade no mercado nacional',
        'Valorização do produto',
        'Preferência de consumidores conscientes',
        'Acesso a redes de varejo sustentável'
      ],
      requirements: [
        'Práticas sustentáveis documentadas',
        'Conformidade ambiental',
        'Responsabilidade social',
        'Auditoria anual'
      ],
      cost: 'R$ 2.500 - R$ 12.000 por ano',
      duration: '6 meses',
      certifier: 'ABNT, INMETRO, certificadoras credenciadas',
      status: 'Disponível'
    }
  ];

  const [selectedCert, setSelectedCert] = useState(null);

  const statusConfig = {
    'Disponível': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    'Em aprovação': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    'Expirada': { color: 'bg-red-100 text-red-800', icon: AlertCircle }
  };

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Por que certificar seus produtos?</h3>
              <p className="text-sm text-gray-700 mb-3">
                Certificações sustentáveis agregam valor ao produto, garantem credibilidade ao consumidor e 
                demonstram compromisso com práticas responsáveis de produção.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Valorização de 30-50% no preço</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Acesso a mercados premium</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Confiança do consumidor</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Diferenciação competitiva</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certifications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {certifications.map((cert, idx) => {
          const StatusIcon = statusConfig[cert.status]?.icon || CheckCircle;
          
          return (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{cert.name}</CardTitle>
                    <CardDescription>{cert.category}</CardDescription>
                  </div>
                  <Badge className={statusConfig[cert.status]?.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {cert.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700">{cert.description}</p>

                <div>
                  <p className="text-xs font-semibold text-gray-900 mb-2">Benefícios:</p>
                  <div className="space-y-1">
                    {cert.benefits.map((benefit, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Custo Anual</p>
                    <p className="font-semibold text-gray-900 text-xs">{cert.cost}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Prazo</p>
                    <p className="font-semibold text-gray-900 text-xs">{cert.duration}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Certificadora(s):</p>
                  <p className="text-sm font-medium text-gray-900">{cert.certifier}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => setSelectedCert(cert)}
                  >
                    Solicitar Certificação
                  </Button>
                  <Button variant="outline" size="icon">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Request Modal */}
      {selectedCert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Solicitar Certificação: {selectedCert.name}</CardTitle>
              <CardDescription>Preencha os dados para iniciar o processo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Requisitos:</h3>
                <div className="space-y-1">
                  {selectedCert.requirements.map((req, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="w-1 h-1 rounded-full bg-gray-400 mt-2" />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Nossa equipe entrará em contato para orientá-lo sobre o processo de certificação e 
                conectá-lo com as certificadoras credenciadas.
              </p>

              <div className="flex gap-3">
                <Button onClick={() => setSelectedCert(null)} variant="outline" className="flex-1">
                  Cancelar
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700">
                  Confirmar Solicitação
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}