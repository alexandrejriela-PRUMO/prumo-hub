import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp } from 'lucide-react';

export default function CRATransactionSection({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    transaction_number: '',
    seller_property_id: '',
    buyer_property_id: '',
    buyer_car: '',
    area_hectares: '',
    price_per_hectare: '',
    transaction_date: '',
    status: 'Em negociação'
  });
  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ['cra-transactions', user?.email],
    queryFn: () => base44.entities.CRATransaction.filter({ seller_email: user?.email }),
    enabled: !!user?.email
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.CRATransaction.create({
      ...data,
      seller_email: user.email,
      total_value: parseFloat(data.area_hectares) * parseFloat(data.price_per_hectare)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cra-transactions'] });
      setShowForm(false);
      setFormData({
        transaction_number: '',
        seller_property_id: '',
        buyer_property_id: '',
        buyer_car: '',
        area_hectares: '',
        price_per_hectare: '',
        transaction_date: '',
        status: 'Em negociação'
      });
    }
  });

  const handleSubmit = () => {
    if (!formData.transaction_number || !formData.seller_property_id || !formData.area_hectares) {
      alert('Preencha os campos obrigatórios');
      return;
    }
    createTransactionMutation.mutate(formData);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Em negociação': 'bg-yellow-100 text-yellow-800',
      'Contrato assinado': 'bg-blue-100 text-blue-800',
      'Concluída': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const totalValue = formData.area_hectares && formData.price_per_hectare 
    ? (parseFloat(formData.area_hectares) * parseFloat(formData.price_per_hectare)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar Transação
        </Button>
      </div>

      {transactions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">Nenhuma transação registrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {transactions.map(transaction => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Transação {transaction.transaction_number}</h3>
                    <Badge className={getStatusColor(transaction.status)}>{transaction.status}</Badge>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Área negociada:</span>
                    <p className="font-medium text-emerald-700">{transaction.area_hectares} ha</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Valor total:</span>
                    <p className="font-medium text-green-700">{transaction.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Preço/ha:</span>
                    <p className="font-medium">R$ {transaction.price_per_hectare.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Data:</span>
                    <p className="font-medium">{new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Nova Transação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Número da Transação *</Label>
              <Input
                value={formData.transaction_number}
                onChange={(e) => setFormData({ ...formData, transaction_number: e.target.value })}
                placeholder="Ex: TXN-2024-001"
                className="mt-1"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Área (ha) *</Label>
                <Input
                  type="number"
                  value={formData.area_hectares}
                  onChange={(e) => setFormData({ ...formData, area_hectares: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Preço por hectare (R$) *</Label>
                <Input
                  type="number"
                  value={formData.price_per_hectare}
                  onChange={(e) => setFormData({ ...formData, price_per_hectare: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="text-sm">
                <span className="text-gray-600">Valor total estimado:</span>
                <p className="font-bold text-emerald-700 text-lg">{totalValue}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Data da Negociação *</Label>
              <Input
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em negociação">Em negociação</SelectItem>
                  <SelectItem value="Contrato assinado">Contrato assinado</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={createTransactionMutation.isPending}
              >
                {createTransactionMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}