import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign, Award, CheckCircle, ChevronRight, Calendar } from 'lucide-react';

export default function ESGDashboard({ greenLoans = [], taxIncentives = [], certifications = [] }) {
  const [selectedMetric, setSelectedMetric] = useState(null);

  // Processar dados de empréstimos verdes
  const loanStatus = {
    total: greenLoans.length,
    approved: greenLoans.filter(l => l.status === 'Aprovado').length,
    pending: greenLoans.filter(l => l.status === 'Em Análise').length,
    rejected: greenLoans.filter(l => l.status === 'Rejeitado').length,
    totalAmount: greenLoans.reduce((sum, l) => sum + (l.approved_amount || 0), 0),
    chartData: [
      { name: 'Aprovado', value: greenLoans.filter(l => l.status === 'Aprovado').length, color: '#10b981' },
      { name: 'Em Análise', value: greenLoans.filter(l => l.status === 'Em Análise').length, color: '#f59e0b' },
      { name: 'Rejeitado', value: greenLoans.filter(l => l.status === 'Rejeitado').length, color: '#ef4444' }
    ]
  };

  // Processar dados de incentivos fiscais
  const incentiveStatus = {
    total: taxIncentives.length,
    active: taxIncentives.filter(i => i.application_status === 'Ativo').length,
    pending: taxIncentives.filter(i => i.application_status === 'Em Análise').length,
    approved: taxIncentives.filter(i => i.application_status === 'Aprovado').length,
    totalBenefit: taxIncentives.reduce((sum, i) => sum + (i.estimated_benefit || 0), 0),
    chartData: [
      { name: 'Ativo', value: taxIncentives.filter(i => i.application_status === 'Ativo').length, color: '#10b981' },
      { name: 'Em Análise', value: taxIncentives.filter(i => i.application_status === 'Em Análise').length, color: '#f59e0b' },
      { name: 'Aprovado', value: taxIncentives.filter(i => i.application_status === 'Aprovado').length, color: '#3b82f6' }
    ]
  };

  // Processar dados de certificações
  const certStatus = {
    total: certifications.length,
    certified: certifications.filter(c => c.status === 'Certificado').length,
    pending: certifications.filter(c => c.status === 'Em Solicitation' || c.status === 'Em Auditoria').length,
    expiring: certifications.filter(c => {
      if (!c.expiration_date) return false;
      const daysLeft = Math.ceil((new Date(c.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 30 && daysLeft > 0;
    }).length,
    chartData: [
      { name: 'Certificado', value: certifications.filter(c => c.status === 'Certificado').length, color: '#10b981' },
      { name: 'Em Análise', value: certifications.filter(c => c.status === 'Em Solicitation' || c.status === 'Em Auditoria').length, color: '#f59e0b' },
      { name: 'Outros', value: certifications.filter(c => c.status !== 'Certificado' && c.status !== 'Em Solicitation' && c.status !== 'Em Auditoria').length, color: '#ef4444' }
    ]
  };

  // Gráfico de linha temporal
  const timelineData = [
    { month: 'Jan', loans: 0, incentives: 0, certs: 0 },
    { month: 'Fev', loans: 1, incentives: 0, certs: 0 },
    { month: 'Mar', loans: 1, incentives: 1, certs: 0 },
    { month: 'Abr', loans: 2, incentives: 1, certs: 0 },
    { month: 'Mai', loans: 2, incentives: 2, certs: 1 },
    { month: 'Jun', loans: greenLoans.length, incentives: taxIncentives.length, certs: certifications.length }
  ];

  const MetricCard = ({ icon: Icon, label, value, subtext, color }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Empréstimos Verdes"
          value={loanStatus.total}
          subtext={`R$ ${(loanStatus.totalAmount / 1000).toFixed(0)}k aprovado`}
          color="bg-emerald-100 text-emerald-600"
        />
        <MetricCard
          icon={TrendingUp}
          label="Incentivos Fiscais"
          value={incentiveStatus.total}
          subtext={`R$ ${(incentiveStatus.totalBenefit / 1000).toFixed(0)}k benefício`}
          color="bg-yellow-100 text-yellow-600"
        />
        <MetricCard
          icon={CheckCircle}
          label="Certificações"
          value={certStatus.total}
          subtext={`${certStatus.certified} certificado(s)`}
          color="bg-blue-100 text-blue-600"
        />
        <MetricCard
          icon={Calendar}
          label="Vencimentos"
          value={certStatus.expiring}
          subtext="próximos 30 dias"
          color="bg-red-100 text-red-600"
        />
      </div>

      {/* Tabs com visualizações detalhadas */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="loans">Empréstimos</TabsTrigger>
          <TabsTrigger value="incentives">Incentivos</TabsTrigger>
          <TabsTrigger value="certifications">Certificações</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Iniciativas ESG</CardTitle>
              <CardDescription>Crescimento ao longo dos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorIncentives" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCerts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="loans" stroke="#10b981" fillOpacity={1} fill="url(#colorLoans)" name="Empréstimos" />
                  <Area type="monotone" dataKey="incentives" stroke="#f59e0b" fillOpacity={1} fill="url(#colorIncentives)" name="Incentivos" />
                  <Area type="monotone" dataKey="certs" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCerts)" name="Certificações" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Resumo de Empréstimos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Empréstimos Verdes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Aprovado</span>
                    <Badge className="bg-green-100 text-green-700">{loanStatus.approved}</Badge>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Em Análise</span>
                    <Badge className="bg-yellow-100 text-yellow-700">{loanStatus.pending}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rejeitado</span>
                    <Badge className="bg-red-100 text-red-700">{loanStatus.rejected}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumo de Incentivos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                  Incentivos Fiscais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Ativo</span>
                    <Badge className="bg-green-100 text-green-700">{incentiveStatus.active}</Badge>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Em Análise</span>
                    <Badge className="bg-yellow-100 text-yellow-700">{incentiveStatus.pending}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Aprovado</span>
                    <Badge className="bg-blue-100 text-blue-700">{incentiveStatus.approved}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumo de Certificações */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  Certificações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Certificado</span>
                    <Badge className="bg-green-100 text-green-700">{certStatus.certified}</Badge>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Em Análise</span>
                    <Badge className="bg-yellow-100 text-yellow-700">{certStatus.pending}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vencendo</span>
                    <Badge className="bg-red-100 text-red-700">{certStatus.expiring}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Empréstimos Verdes */}
        <TabsContent value="loans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status dos Empréstimos Verdes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={loanStatus.chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {loanStatus.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes dos Empréstimos</CardTitle>
            </CardHeader>
            <CardContent>
              {greenLoans.length > 0 ? (
                <div className="space-y-3">
                  {greenLoans.map((loan, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{loan.loan_type}</p>
                        <p className="text-sm text-gray-600">R$ {loan.approved_amount?.toLocaleString('pt-BR') || 'Pendente'}</p>
                      </div>
                      <Badge className={
                        loan.status === 'Aprovado' ? 'bg-green-100 text-green-700' :
                        loan.status === 'Em Análise' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }>
                        {loan.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">Nenhum empréstimo verde registrado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incentivos Fiscais */}
        <TabsContent value="incentives" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status dos Incentivos Fiscais</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incentiveStatus.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes dos Incentivos</CardTitle>
            </CardHeader>
            <CardContent>
              {taxIncentives.length > 0 ? (
                <div className="space-y-3">
                  {taxIncentives.map((incentive, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{incentive.incentive_name}</p>
                        <p className="text-sm text-gray-600">Benefício: R$ {incentive.estimated_benefit?.toLocaleString('pt-BR') || '0'}</p>
                      </div>
                      <Badge className={
                        incentive.application_status === 'Ativo' ? 'bg-green-100 text-green-700' :
                        incentive.application_status === 'Em Análise' ? 'bg-yellow-100 text-yellow-700' :
                        incentive.application_status === 'Aprovado' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }>
                        {incentive.application_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">Nenhum incentivo fiscal registrado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificações */}
        <TabsContent value="certifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status das Certificações</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={certStatus.chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {certStatus.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes das Certificações</CardTitle>
            </CardHeader>
            <CardContent>
              {certifications.length > 0 ? (
                <div className="space-y-3">
                  {certifications.map((cert, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{cert.certification_type}</p>
                        <p className="text-sm text-gray-600">
                          {cert.expiration_date ? `Vence: ${new Date(cert.expiration_date).toLocaleDateString('pt-BR')}` : 'Data de vencimento não definida'}
                        </p>
                      </div>
                      <Badge className={
                        cert.status === 'Certificado' ? 'bg-green-100 text-green-700' :
                        cert.status === 'Em Auditoria' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                      }>
                        {cert.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">Nenhuma certificação registrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}