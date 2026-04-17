import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Download,
  Calendar,
  Receipt,
  Headphones,
  ExternalLink
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  'Pendente': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  'Pago': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
  'Vencido': { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  'Cancelado': { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: Clock },
};

export default function Invoices() {
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

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', user?.email],
    queryFn: () => base44.entities.Invoice.filter({ client_email: user.email }, '-due_date'),
    enabled: !!user?.email,
    initialData: [],
  });

  const getInvoiceStatus = (invoice) => {
    if (invoice.status === 'Pago') return 'Pago';
    if (invoice.status === 'Cancelado') return 'Cancelado';
    if (invoice.due_date && isPast(parseISO(invoice.due_date))) return 'Vencido';
    return 'Pendente';
  };

  const pendingInvoices = invoices.filter(inv => {
    const status = getInvoiceStatus(inv);
    return status === 'Pendente' || status === 'Vencido';
  });
  const paidInvoices = invoices.filter(inv => getInvoiceStatus(inv) === 'Pago');
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const InvoiceCard = ({ invoice }) => {
    const status = getInvoiceStatus(invoice);
    const config = statusConfig[status];
    const StatusIcon = config.icon;

    return (
      <Card className="hover:shadow-lg transition-shadow border-gray-100">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                status === 'Pago' ? 'bg-emerald-100' :
                status === 'Vencido' ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                <Receipt className={`w-6 h-6 ${
                  status === 'Pago' ? 'text-emerald-600' :
                  status === 'Vencido' ? 'text-red-600' : 'text-amber-600'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{invoice.description || 'Mensalidade'}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Vencimento: {invoice.due_date ? format(parseISO(invoice.due_date), "dd/MM/yyyy") : '-'}</span>
                </div>
                {invoice.payment_date && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Pago em {format(parseISO(invoice.payment_date), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                R$ {(invoice.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <Badge className={`mt-2 ${config.color} border`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status}
              </Badge>
            </div>
          </div>

          {status !== 'Pago' && invoice.boleto_url && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <a
                href={invoice.boleto_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 transition-all font-medium"
              >
                <Download className="w-5 h-5" />
                Baixar Boleto
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assinatura e Boletos</h1>
          <p className="text-gray-500 mt-1">Gerencie sua assinatura e acompanhe seus pagamentos</p>
        </div>
        <Link to="/Support">
          <Button className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shrink-0">
            <Headphones className="w-4 h-4" />
            Fale com um Especialista
          </Button>
        </Link>
      </div>

      {/* Info Card Nexano */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-7 h-7 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-900 text-lg">Gerencie sua assinatura no PRUMO Hub</h3>
              <p className="text-emerald-700 text-sm mt-1">
                Assine ou gerencie seu plano diretamente em nosso portal de pagamentos. Escolha o plano ideal para o seu perfil.
              </p>
            </div>
            <a
              href="https://hub.prumo.site/landing"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 shrink-0 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Acessar Portal
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Faturas */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-emerald-600" />
          Histórico de Faturas
        </h2>

        {pendingInvoices.length > 0 && (
          <Card className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 text-white mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-amber-100">Pagamentos Pendentes</p>
                    <p className="text-3xl font-bold">
                      R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-amber-100">{pendingInvoices.length}</p>
                  <p className="text-sm text-amber-100">boleto(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendentes ({pendingInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Pagos ({paidInvoices.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            ) : pendingInvoices.length === 0 ? (
              <Card className="border-dashed border-2 border-emerald-200">
                <CardContent className="py-16 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">Tudo em dia! 🎉</h3>
                  <p className="text-gray-500 mt-2">Você não tem pagamentos pendentes</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingInvoices.map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="paid" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : paidInvoices.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-16 text-center">
                  <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">Nenhum pagamento registrado</h3>
                  <p className="text-gray-500 mt-2">Seus pagamentos aparecerão aqui</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {paidInvoices.map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}