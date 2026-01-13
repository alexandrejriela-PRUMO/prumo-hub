import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function InvoicesSummary({ invoices }) {
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pendente' || inv.status === 'Vencido');
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  if (invoices.length === 0) {
    return (
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum boleto cadastrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-gray-900">Financeiro</CardTitle>
        <Link 
          to={createPageUrl('Invoices')} 
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          Ver todos <ArrowRight className="w-4 h-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {pendingInvoices.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mb-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Pendentes</p>
                  <p className="text-sm text-amber-700">{pendingInvoices.length} boleto(s)</p>
                </div>
              </div>
              <p className="text-xl font-bold text-amber-900">
                R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {invoices.slice(0, 3).map((invoice) => {
            const isOverdue = invoice.due_date && isPast(parseISO(invoice.due_date)) && invoice.status !== 'Pago';
            return (
              <div key={invoice.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    invoice.status === 'Pago' ? 'bg-emerald-100' :
                    isOverdue ? 'bg-red-100' : 'bg-amber-100'
                  }`}>
                    {invoice.status === 'Pago' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <CreditCard className={`w-5 h-5 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{invoice.description || 'Mensalidade'}</p>
                    <p className="text-xs text-gray-500">
                      Venc.: {invoice.due_date ? format(parseISO(invoice.due_date), "dd/MM/yyyy") : '-'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    R$ {(invoice.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <Badge className={`text-xs ${
                    invoice.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' :
                    isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isOverdue ? 'Vencido' : invoice.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}