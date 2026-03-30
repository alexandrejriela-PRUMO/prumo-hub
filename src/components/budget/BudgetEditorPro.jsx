import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Mail, Plus, Trash2, Copy } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Componente de edição inline
const EditableField = ({ value, onSave, className = '', multiline = false, type = 'text' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleSave = () => {
    onSave(tempValue);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className={`cursor-pointer hover:bg-blue-50 p-1 rounded transition ${className}`}
        title="Clique para editar"
      >
        {type === 'currency' ? `R$ ${parseFloat(value || 0).toFixed(2)}` : value || '(clique para editar)'}
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      {multiline ? (
        <textarea
          autoFocus
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          className="flex-1 border border-blue-400 rounded p-1 text-sm"
          rows={3}
        />
      ) : (
        <input
          autoFocus
          type={type}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          className="flex-1 border border-blue-400 rounded p-1 text-sm"
        />
      )}
      <Button size="sm" onClick={handleSave} className="bg-blue-600 text-white">
        ✓
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setTempValue(value);
          setIsEditing(false);
        }}
      >
        ✕
      </Button>
    </div>
  );
};

export default function BudgetEditorPro({ budgetData = {}, onSave, onSend }) {
  const [data, setData] = useState({
    // Cabeçalho
    company: {
      logo_url: '',
      name: 'Sua Empresa',
      cnpj: '',
      phone: '',
      email: '',
      address: '',
    },
    // Cliente
    client: {
      name: budgetData.client_name || '',
      document: '',
      phone: '',
      email: budgetData.client_email || '',
      address: '',
      property: '',
    },
    // Orçamento
    budget: {
      number: budgetData.budget_number || '001',
      date: new Date().toLocaleDateString('pt-BR'),
      validity_days: 30,
      responsible: '',
    },
    // Serviços
    services: budgetData.services || [
      { id: 1, description: 'Serviço 1', quantity: 1, unit_value: 0, total: 0 },
    ],
    // Totais
    discount: 0,
    notes: '',
    payment_terms: 'A combinar',
    execution_deadline: '30 dias',
  });

  const previewRef = useRef(null);

  const updateField = (path, value) => {
    setData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const updateService = (id, field, value) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.id === id
          ? {
              ...s,
              [field]: value,
              total: field === 'quantity' || field === 'unit_value' 
                ? (field === 'quantity' ? value : s.quantity) * (field === 'unit_value' ? value : s.unit_value)
                : s.total,
            }
          : s
      ),
    }));
  };

  const addService = () => {
    const newId = Math.max(...data.services.map((s) => s.id), 0) + 1;
    setData((prev) => ({
      ...prev,
      services: [...prev.services, { id: newId, description: '', quantity: 1, unit_value: 0, total: 0 }],
    }));
  };

  const removeService = (id) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.id !== id),
    }));
  };

  const subtotal = data.services.reduce((sum, s) => sum + (s.total || 0), 0);
  const total = subtotal - data.discount;

  const exportPDF = async () => {
    const element = previewRef.current;
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`orcamento-${data.budget.number}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const handleSave = () => {
    onSave({
      ...data,
      documentHtml: previewRef.current?.innerHTML || '',
      totalAmount: total,
    });
  };

  const handleSend = () => {
    onSend({
      ...data,
      documentHtml: previewRef.current?.innerHTML || '',
      totalAmount: total,
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 pb-24">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Edição */}
        <div className="space-y-6 bg-white rounded-lg p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold mb-4 text-gray-900">Dados da Empresa</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-600 mb-1">Nome</label>
                <EditableField value={data.company.name} onSave={(v) => updateField('company.name', v)} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">CNPJ</label>
                <EditableField value={data.company.cnpj} onSave={(v) => updateField('company.cnpj', v)} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Telefone</label>
                <EditableField value={data.company.phone} onSave={(v) => updateField('company.phone', v)} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Email</label>
                <EditableField value={data.company.email} onSave={(v) => updateField('company.email', v)} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Endereço</label>
                <EditableField value={data.company.address} onSave={(v) => updateField('company.address', v)} multiline />
              </div>
            </div>
          </div>

          <hr />

          <div>
            <h2 className="text-lg font-bold mb-4 text-gray-900">Dados do Cliente</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-600 mb-1">Nome</label>
                <EditableField value={data.client.name} onSave={(v) => updateField('client.name', v)} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">CPF/CNPJ</label>
                <EditableField value={data.client.document} onSave={(v) => updateField('client.document', v)} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Email</label>
                <EditableField value={data.client.email} onSave={(v) => updateField('client.email', v)} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Telefone</label>
                <EditableField value={data.client.phone} onSave={(v) => updateField('client.phone', v)} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Endereço</label>
                <EditableField value={data.client.address} onSave={(v) => updateField('client.address', v)} multiline />
              </div>
            </div>
          </div>

          <hr />

          <div>
            <h2 className="text-lg font-bold mb-4 text-gray-900">Informações do Orçamento</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-600 mb-1">Número</label>
                <EditableField value={data.budget.number} onSave={(v) => updateField('budget.number', v)} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Data de Emissão</label>
                <EditableField value={data.budget.date} onSave={(v) => updateField('budget.date', v)} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Validade (dias)</label>
                <EditableField value={data.budget.validity_days} onSave={(v) => updateField('budget.validity_days', v)} type="number" />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Responsável Técnico</label>
                <EditableField value={data.budget.responsible} onSave={(v) => updateField('budget.responsible', v)} />
              </div>
            </div>
          </div>

          <hr />

          <div>
            <h2 className="text-lg font-bold mb-4 text-gray-900">Serviços</h2>
            <div className="space-y-3">
              {data.services.map((service) => (
                <div key={service.id} className="border rounded-lg p-3 bg-gray-50 text-sm">
                  <div className="mb-2">
                    <label className="block text-gray-600 mb-1">Descrição</label>
                    <EditableField
                      value={service.description}
                      onSave={(v) => updateService(service.id, 'description', v)}
                      multiline
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-gray-600 mb-1">Qtd</label>
                      <EditableField
                        value={service.quantity}
                        onSave={(v) => updateService(service.id, 'quantity', parseFloat(v) || 0)}
                        type="number"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Valor Unit.</label>
                      <EditableField
                        value={service.unit_value}
                        onSave={(v) => updateService(service.id, 'unit_value', parseFloat(v) || 0)}
                        type="number"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Total</label>
                      <div className="font-semibold">R$ {service.total.toFixed(2)}</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeService(service.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 mt-2 w-full"
                  >
                    <Trash2 className="w-4 h-4" /> Remover
                  </Button>
                </div>
              ))}
              <Button onClick={addService} variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" /> Adicionar Serviço
              </Button>
            </div>
          </div>

          <hr />

          <div>
            <h2 className="text-lg font-bold mb-4 text-gray-900">Totais e Condições</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-600 mb-1">Desconto (R$)</label>
                <EditableField
                  value={data.discount}
                  onSave={(v) => updateField('discount', parseFloat(v) || 0)}
                  type="number"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Forma de Pagamento</label>
                <EditableField value={data.payment_terms} onSave={(v) => updateField('payment_terms', v)} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Prazo de Execução</label>
                <EditableField value={data.execution_deadline} onSave={(v) => updateField('execution_deadline', v)} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Observações</label>
                <EditableField value={data.notes} onSave={(v) => updateField('notes', v)} multiline />
              </div>
            </div>
          </div>
        </div>

        {/* Prévia - Documento */}
        <div>
          <div className="bg-white rounded-lg shadow-sm p-8 sticky top-4" ref={previewRef} style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div className="border-b-2 border-gray-900 pb-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900">ORÇAMENTO</h1>
              <p className="text-gray-600 text-sm">Nº {data.budget.number}</p>
            </div>

            {/* Info da Empresa */}
            <div className="mb-6 text-sm text-gray-700">
              <div className="font-bold text-lg mb-2">{data.company.name}</div>
              {data.company.cnpj && <div>CNPJ: {data.company.cnpj}</div>}
              {data.company.phone && <div>Tel: {data.company.phone}</div>}
              {data.company.email && <div>Email: {data.company.email}</div>}
              {data.company.address && <div>Endereço: {data.company.address}</div>}
            </div>

            <hr className="my-6" />

            {/* Info do Cliente */}
            <div className="mb-6">
              <h3 className="font-bold mb-2 text-gray-900">CLIENTE</h3>
              <div className="text-sm text-gray-700">
                <div><strong>{data.client.name}</strong></div>
                {data.client.document && <div>CPF/CNPJ: {data.client.document}</div>}
                {data.client.email && <div>Email: {data.client.email}</div>}
                {data.client.phone && <div>Tel: {data.client.phone}</div>}
              </div>
            </div>

            {/* Info do Orçamento */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <span className="text-gray-600">Data: </span>
                <span className="font-semibold">{data.budget.date}</span>
              </div>
              <div>
                <span className="text-gray-600">Validade: </span>
                <span className="font-semibold">{data.budget.validity_days} dias</span>
              </div>
            </div>

            <hr className="my-6" />

            {/* Serviços */}
            <h3 className="font-bold mb-4 text-gray-900">SERVIÇOS</h3>
            <table className="w-full mb-6 text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left pb-2">Descrição</th>
                  <th className="text-center pb-2 w-16">Qtd</th>
                  <th className="text-right pb-2 w-24">Valor Unit.</th>
                  <th className="text-right pb-2 w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.services.map((s) => (
                  <tr key={s.id} className="border-b border-gray-200">
                    <td className="py-2">{s.description}</td>
                    <td className="text-center py-2">{s.quantity}</td>
                    <td className="text-right py-2">R$ {s.unit_value.toFixed(2)}</td>
                    <td className="text-right py-2">R$ {s.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totais */}
            <div className="mb-6 text-right text-sm">
              <div className="mb-2">Subtotal: <span className="font-semibold">R$ {subtotal.toFixed(2)}</span></div>
              {data.discount > 0 && (
                <div className="mb-2">Desconto: <span className="font-semibold">-R$ {data.discount.toFixed(2)}</span></div>
              )}
              <div className="text-lg font-bold pt-2 border-t border-gray-900">
                Total: R$ {total.toFixed(2)}
              </div>
            </div>

            {/* Condições */}
            <hr className="my-6" />
            <div className="text-sm text-gray-700 space-y-2">
              <div><strong>Forma de Pagamento:</strong> {data.payment_terms}</div>
              <div><strong>Prazo:</strong> {data.execution_deadline}</div>
              {data.notes && <div><strong>Observações:</strong><br />{data.notes}</div>}
            </div>

            {/* Assinatura */}
            <div className="mt-12 pt-6 border-t border-gray-300">
              <div className="text-center text-sm text-gray-600">
                <div className="mb-8">&nbsp;</div>
                <div><strong>{data.budget.responsible}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé com Ações */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex gap-3 justify-end">
          <Button onClick={exportPDF} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
          <Button onClick={handleSave} variant="outline" className="gap-2">
            Salvar Orçamento
          </Button>
          <Button onClick={handleSend} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Mail className="w-4 h-4" /> Enviar por Email
          </Button>
        </div>
      </div>
    </div>
  );
}