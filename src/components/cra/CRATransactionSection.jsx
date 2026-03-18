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
import { Plus, TrendingUp, AlertCircle } from 'lucide-react';

export default function CRATransactionSection({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [formData, setFormData] = useState({
    transaction_number: '',
    cra_title_id: '',
    buyer_email: '',
    buyer_property_id: '',
    buyer_car: '',
    area_hectares: '',
    price_per_hectare: '',
    transaction_date: '',
    status: 'Em negociação'
  });

  const queryClient = useQueryClient();

  const { data: titles = [] } = useQuery({
    queryKey: ['cra-titles-for-transaction', user?.email],
    queryFn: () => base44.entities.CRATitle.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['cra-transactions', user?.email],
    queryFn: () => base44.entities.CRATransaction.filter({ seller_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: buyerProperties = [] } = useQuery({
    queryKey: ['properties-for-buyer', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.CRATransaction.create({
      ...data,
      seller_email: user.email,
      seller_property_id: selectedTitle?.property_id,
      origin_id: selectedTitle?.origin_id,
      total_value: parseFloat(data.area_hectares) * parseFloat(data.price_per_hectare)
    }),
    onSuccess: () => {
      // 🟡 MÉDIO #9: Invalidar cache de títulos também
      queryClient.invalidateQueries({ queryKey: ['cra-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cra-titles'] });
      queryClient.invalidateQueries({ queryKey: ['cra-titles-for-transaction'] });
      setShowForm(false);
      setSelectedTitle(null);
      setFormData({
        transaction_number: '',
        cra_title_id: '',
        buyer_email: '',
        buyer_property_id: '',
        buyer_car: '',
        area_hectares: '',
        price_per_hectare: '',
        transaction_date: '',
        status: 'Em negociação'
      });
      console.log('[CRA] Transação criada com sucesso');
    },
    onError: (error) => {
      console.error('[CRA] Erro ao criar transação:', error);
    }
  });

  const handleTitleChange = (titleId) => {
    const title = titles.find(t => t.id === titleId);
    setSelectedTitle(title);
    setFormData({
      ...formData,
      cra_title_id: titleId,
      cra_number: title?.cra_number || ''
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Em negociação': 'bg-yellow-100 text-yellow-800',
      'Contrato assinado': 'bg-blue-100 text-blue-800',
      'Concluída': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getAvailableArea = (title) => {
    if (!title) return 0;
    const usedArea = title.transaction_history?.reduce((sum, t) => sum + (t.area_hectares || 0), 0) || 0;
    return (title.available_area_hectares || title.cra_area_hectares) - usedArea;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Transação
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
          {transactions.map(transaction => {
            const totalValue = transaction.total_value || 0;
            
            return (
              <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-gray-900">Transação {transaction.transaction_number}</h3>
                        <Badge className={getStatusColor(transaction.status)}>{transaction.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">CRA: {transaction.cra_number}</p>
                    </div>
                  </div>

                  {/* Fluxo de Transação */}
                  <div className="bg-gradient-to-r from-emerald-50 to-purple-50 p-4 rounded-lg mb-4 border border-emerald-200">
                    <p className="text-xs font-semibold text-gray-700 mb-3">Fluxo da Transação:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-600" />
                        <span className="text-sm"><strong>Vendedor (Propriedade Origem):</strong></span>
                        <span className="text-sm font-mono bg-white px-2 py-1 rounded text-xs">{transaction.seller_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-600" />
                        <span className="text-sm"><strong>Comprador (Compensação):</strong></span>
                        <span className="text-sm font-mono bg-white px-2 py-1 rounded text-xs">{transaction.buyer_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                        <span className="text-sm"><strong>Propriedade Compradora (CAR):</strong></span>
                        <span className="text-sm font-mono bg-white px-2 py-1 rounded text-xs">{transaction.buyer_car}</span>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Área Negociada:</span>
                      <p className="font-medium text-emerald-700">{transaction.area_hectares} ha</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Valor/ha:</span>
                      <p className="font-medium">R$ {parseFloat(transaction.price_per_hectare).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Valor Total:</span>
                      <p className="font-bold text-purple-700">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Data:</span>
                      <p className="font-medium">{new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl sm:max-w-lg md:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nova Transação de CRA</DialogTitle>
            <p className="text-xs text-gray-600 mt-2">Você é o VENDEDOR. Indique quem será o COMPRADOR (que fará compensação)</p>
          </DialogHeader>
          <div className="space-y-4">
            {/* Título CRA */}
            <div>
              <Label className="text-sm font-medium">Título CRA (que você vai vender) *</Label>
              <Select value={formData.cra_title_id} onValueChange={handleTitleChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o título CRA" />
                </SelectTrigger>
                <SelectContent>
                  {titles.map(title => {
                    const available = getAvailableArea(title);
                    return (
                      <SelectItem key={title.id} value={title.id} disabled={available <= 0}>
                        CRA {title.cra_number} - {available.toFixed(2)}ha disponível
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedTitle && (
                <div className="mt-2 p-3 bg-green-50 rounded text-xs text-green-900 border border-green-200">
                  <p><strong>CRA:</strong> {selectedTitle.cra_number}</p>
                  <p><strong>Área Total:</strong> {selectedTitle.cra_area_hectares} ha</p>
                  <p><strong>Disponível:</strong> {getAvailableArea(selectedTitle).toFixed(2)} ha</p>
                  <p className="mt-1"><strong>Sua Propriedade (Origem):</strong> CAR da propriedade vendedora</p>
                </div>
              )}
            </div>

            {/* Comprador */}
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label className="text-sm font-medium">Email do Comprador *</Label>
                <Input
                  type="email"
                  value={formData.buyer_email}
                  onChange={(e) => setFormData({ ...formData, buyer_email: e.target.value })}
                  placeholder="comprador@email.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Propriedade Compradora (CAR) *</Label>
                <Input
                  value={formData.buyer_car}
                  onChange={(e) => setFormData({ ...formData, buyer_car: e.target.value })}
                  placeholder="Ex: 123.456.789-12.0001-25"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Detalhes Comerciais */}
            <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <Label className="text-sm font-medium">Área (ha) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.area_hectares}
                  onChange={(e) => setFormData({ ...formData, area_hectares: e.target.value })}
                  placeholder="Área a ser negociada"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Valor por ha (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price_per_hectare}
                  onChange={(e) => setFormData({ ...formData, price_per_hectare: e.target.value })}
                  placeholder="Valor"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Valor Total</Label>
                <div className="mt-1 p-2 bg-gray-100 rounded font-bold text-emerald-700">
                  R$ {(
                    (parseFloat(formData.area_hectares) || 0) * 
                    (parseFloat(formData.price_per_hectare) || 0)
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Data e Status */}
            <div className="grid md:grid-cols-2 gap-4">
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
                <Label className="text-sm font-medium">Status *</Label>
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
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setSelectedTitle(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createTransactionMutation.mutate(formData)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={createTransactionMutation.isPending}
              >
                {createTransactionMutation.isPending ? 'Registrando...' : 'Registrar Transação'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}