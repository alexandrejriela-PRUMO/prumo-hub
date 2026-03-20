import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function InviteExpirationInfo({ member }) {
  if (!member?.expires_at) return null;

  const expiresDate = new Date(member.expires_at);
  const now = new Date();
  const daysRemaining = differenceInDays(expiresDate, now);
  const isExpired = daysRemaining < 0;

  if (isExpired) {
    return (
      <div className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-red-700">Convite Expirado</p>
          <p className="text-xs text-red-600">Expirou em {format(expiresDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
        </div>
      </div>
    );
  }

  if (daysRemaining <= 2) {
    return (
      <div className="flex items-start gap-2 p-2.5 bg-yellow-50 rounded-lg border border-yellow-200">
        <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-yellow-700">Convite Expira em Breve</p>
          <p className="text-xs text-yellow-600">{daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''}</p>
        </div>
      </div>
    );
  }

  return null;
}