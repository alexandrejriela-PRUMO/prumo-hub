import React, { useMemo } from 'react';
import { AlertTriangle, Clock, Bell } from 'lucide-react';
import { differenceInDays, differenceInYears, parseISO, isValid } from 'date-fns';

function parseDate(d) {
  if (!d) return null;
  const parsed = parseISO(d);
  return isValid(parsed) ? parsed : null;
}

export function generateCARAlerts(carRecord) {
  if (!carRecord) return [];
  const alerts = [];
  const now = new Date();

  // CAR sem atualização há mais de 5 anos
  const lastUpdate = parseDate(carRecord.car_last_update) || parseDate(carRecord.car_registration_date);
  if (lastUpdate && differenceInYears(now, lastUpdate) >= 5) {
    alerts.push({ severity: 'warning', message: 'CAR sem atualização há mais de 5 anos', type: 'car_outdated' });
  }

  // CAR com inconsistências
  if (carRecord.car_status === 'Com inconsistências' || carRecord.car_status === 'Necessita retificação') {
    alerts.push({ severity: 'critical', message: `CAR com status: ${carRecord.car_status}`, type: 'car_inconsistency' });
  }

  // PRA com prazo próximo (90 dias)
  const praDeadline = parseDate(carRecord.pra_deadline);
  if (praDeadline && carRecord.pra_status !== 'Concluído') {
    const days = differenceInDays(praDeadline, now);
    if (days < 0) {
      alerts.push({ severity: 'critical', message: `Prazo do PRA vencido há ${Math.abs(days)} dias`, type: 'pra_overdue' });
    } else if (days <= 90) {
      alerts.push({ severity: 'warning', message: `Prazo do PRA vence em ${days} dias`, type: 'pra_deadline' });
    }
  }

  // PRAD com monitoramento pendente
  if (carRecord.recovery_project_status === 'PRAD em execução') {
    alerts.push({ severity: 'info', message: 'PRAD em execução — verificar monitoramento', type: 'prad_monitoring' });
  }

  // Recovery deadline
  const recoveryDeadline = parseDate(carRecord.recovery_deadline);
  if (recoveryDeadline && carRecord.recovery_project_status !== 'PRAD concluído' && carRecord.recovery_project_status !== 'Não possui') {
    const days = differenceInDays(recoveryDeadline, now);
    if (days < 0) {
      alerts.push({ severity: 'critical', message: `Prazo do PRAD vencido há ${Math.abs(days)} dias`, type: 'prad_overdue' });
    } else if (days <= 90) {
      alerts.push({ severity: 'warning', message: `Prazo de execução do PRAD vence em ${days} dias`, type: 'prad_deadline' });
    }
  }

  return alerts;
}

export default function CARAlerts({ carRecord }) {
  const alerts = useMemo(() => generateCARAlerts(carRecord), [carRecord]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, idx) => {
        const colors = alert.severity === 'critical'
          ? 'bg-red-50 border-red-200 text-red-800'
          : alert.severity === 'warning'
          ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-blue-50 border-blue-200 text-blue-800';
        const Icon = alert.severity === 'critical' ? AlertTriangle : alert.severity === 'warning' ? Clock : Bell;
        return (
          <div key={idx} className={`flex items-start gap-2 p-3 rounded-lg border ${colors}`}>
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm font-medium">{alert.message}</span>
          </div>
        );
      })}
    </div>
  );
}