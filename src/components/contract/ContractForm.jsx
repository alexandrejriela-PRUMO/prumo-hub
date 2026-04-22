import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

export default function ContractForm({ properties = [], onSubmit, initialData = null }) {
  const [formData, setFormData] = useState(initialData || {
    client_name: '',
    client_email: '',
    contract_type: 'Prestação de Serviços',
    object: '',
    start_date: '',
    end_date: '',
    total_value: 0,
    payment_terms: '',
    signers: [{ name: '', email: '' }],
    notes: '',
    contratante: { name: '', document: '', address: '' },
    contratada: { name: '', document: '', address: '' }
  });

  const handleAddSigner = () => {
    setFormData(prev => ({
      ...prev,
      signers: [...prev.signers, { name: '', email: '' }]
    }));
  };

  const handleRemoveSigner = (index) => {
    setFormData(prev => ({
      ...prev,
      signers: prev.signers.filter((_, i) => i !== index)
    }));
  };

  const handleSignerChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      signers: prev.signers.map((signer, i) =>
        i === index ? { ...signer, [field]: value } : signer
      )
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const contractTypes = [
    'Prestação de Serviços',
    'Consultoria Ambiental',
    'Assessoria Técnica',
    'Licenciamento',
    'Georreferenciamento',
    'Outro'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações do Contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome do Cliente *</label>
              <Input
                value={formData.client_name}
                onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email do Cliente *</label>
              <Input
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Contrato *</label>
              <select
                value={formData.contract_type}
                onChange={(e) => setFormData({...formData, contract_type: e.target.value})}
                className="w-full border rounded-lg p-2"
                required
              >
                {contractTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Objeto do Contrato *</label>
              <Input
                value={formData.object}
                onChange={(e) => setFormData({...formData, object: e.target.value})}
                placeholder="Descrição do objeto/serviço"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contratante */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contratante (Quem contrata)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Razão Social / Nome Completo *</label>
            <Input
              value={formData.contratante.name}
              onChange={(e) => setFormData({...formData, contratante: {...formData.contratante, name: e.target.value}})}
              placeholder="Nome ou Razão Social do Contratante"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CNPJ / CPF</label>
            <Input
              value={formData.contratante.document}
              onChange={(e) => setFormData({...formData, contratante: {...formData.contratante, document: e.target.value}})}
              placeholder="00.000.000/0001-00 ou 000.000.000-00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Endereço</label>
            <Input
              value={formData.contratante.address}
              onChange={(e) => setFormData({...formData, contratante: {...formData.contratante, address: e.target.value}})}
              placeholder="Rua, nº, Cidade - UF"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contratada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contratada (Quem presta o serviço)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Razão Social / Nome Completo *</label>
            <Input
              value={formData.contratada.name}
              onChange={(e) => setFormData({...formData, contratada: {...formData.contratada, name: e.target.value}})}
              placeholder="Nome ou Razão Social da Contratada"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CNPJ / CPF</label>
            <Input
              value={formData.contratada.document}
              onChange={(e) => setFormData({...formData, contratada: {...formData.contratada, document: e.target.value}})}
              placeholder="00.000.000/0001-00 ou 000.000.000-00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Endereço</label>
            <Input
              value={formData.contratada.address}
              onChange={(e) => setFormData({...formData, contratada: {...formData.contratada, address: e.target.value}})}
              placeholder="Rua, nº, Cidade - UF"
            />
          </div>
        </CardContent>
      </Card>

      {/* Datas e Valores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datas e Valores</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data Início *</label>
            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data Término</label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valor Total (R$)</label>
            <Input
              type="number"
              step="0.01"
              value={formData.total_value}
              onChange={(e) => setFormData({...formData, total_value: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Condições de Pagamento</label>
            <Input
              value={formData.payment_terms}
              onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
              placeholder="Ex: 30 dias após serviço"
            />
          </div>
        </CardContent>
      </Card>

      {/* Signatários */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Signatários (Assinatura Digital)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.signers.map((signer, index) => (
            <div key={index} className="flex gap-3 items-end p-4 bg-slate-50 rounded-lg">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <Input
                  placeholder="Nome"
                  value={signer.name}
                  onChange={(e) => handleSignerChange(index, 'name', e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={signer.email}
                  onChange={(e) => handleSignerChange(index, 'email', e.target.value)}
                />
              </div>
              {formData.signers.length > 1 && (
                <Button
                  type="button"
                  onClick={() => handleRemoveSigner(index)}
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            onClick={handleAddSigner}
            variant="outline"
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" /> Adicionar Signatário
          </Button>
        </CardContent>
      </Card>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium mb-1">Observações</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Termos e condições adicionais..."
          className="w-full border rounded-lg p-3 text-sm"
          rows="4"
        />
      </div>

      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
        Próximo: Editar Contrato
      </Button>
    </form>
  );
}