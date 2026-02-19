import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Building2, Mail, Phone, MapPin, FileText, Calendar, Hash, Info } from 'lucide-react';

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <Icon className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-800 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function ClientProfilePanel({ client }) {
  // Os dados do cliente ficam salvos em authorized_users como JSON
  // Tenta ler da primeira propriedade vinculada
  const firstProperty = client?.properties?.[0];
  let clientInfo = {};
  let clientType = 'pf';

  if (firstProperty?.authorized_users) {
    try {
      clientInfo = JSON.parse(firstProperty.authorized_users);
      clientType = clientInfo.client_type || 'pf';
    } catch (e) {
      clientInfo = {};
    }
  }

  const isPF = clientType === 'pf';
  const clientName = client?.client_name || client?.client_email?.split('@')[0];
  const contactParts = firstProperty?.client_contact?.split(' | ') || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl">
        <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xl font-bold">
            {clientName?.charAt(0)?.toUpperCase()}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{clientName}</h3>
          <Badge className={isPF ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
            {isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}
          </Badge>
        </div>
      </div>

      {/* Dados Pessoais / Empresariais */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">
            {isPF ? 'Dados Pessoais' : 'Dados Empresariais'}
          </p>

          {isPF ? (
            <>
              <InfoRow icon={User} label="Nome Completo" value={clientName} />
              <InfoRow icon={Hash} label="CPF" value={clientInfo.cpf} />
              <InfoRow icon={FileText} label="RG" value={clientInfo.rg} />
              <InfoRow icon={Calendar} label="Data de Nascimento" value={clientInfo.birth_date ? new Date(clientInfo.birth_date).toLocaleDateString('pt-BR') : null} />
            </>
          ) : (
            <>
              <InfoRow icon={Building2} label="Razão Social" value={clientName} />
              <InfoRow icon={Hash} label="CNPJ" value={clientInfo.cnpj} />
              <InfoRow icon={FileText} label="Inscrição Estadual" value={clientInfo.state_registration} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">Contato</p>
          <InfoRow icon={Mail} label="E-mail" value={client?.client_email} />
          <InfoRow icon={Phone} label="Telefone / WhatsApp" value={clientInfo.phone || contactParts[0]} />
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">Endereço</p>
          <InfoRow icon={MapPin} label="Endereço" value={clientInfo.address} />
          <InfoRow icon={MapPin} label="Cidade" value={clientInfo.city} />
          <InfoRow icon={MapPin} label="Estado" value={clientInfo.state} />
          <InfoRow icon={MapPin} label="CEP" value={clientInfo.zip_code} />
        </CardContent>
      </Card>

      {/* Observações */}
      {clientInfo.notes && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">Observações</p>
            <InfoRow icon={Info} label="Notas" value={clientInfo.notes} />
          </CardContent>
        </Card>
      )}

      {/* Propriedades Vinculadas */}
      {client?.properties?.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">
              Propriedades e Empreendimentos ({client.properties.filter(p => !p.is_client_only).length})
            </p>
            <div className="space-y-2">
              {client.properties.filter(p => !p.is_client_only).map(prop => (
                <div key={prop.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{prop.property_name}</p>
                    <p className="text-xs text-gray-500">{prop.city}/{prop.state}</p>
                  </div>
                  <Badge className={prop.property_type === 'urbano' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}>
                    {prop.property_type === 'urbano' ? 'Urbano' : 'Rural'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}