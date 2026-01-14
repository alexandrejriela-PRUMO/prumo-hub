import { base44 } from '@/api/base44Client';

export async function checkAndSendNotifications(userEmail) {
  try {
    const greenLoans = await base44.entities.GreenLoan.filter({ applicant_email: userEmail });
    const taxIncentives = await base44.entities.TaxIncentive.filter({ applicant_email: userEmail });
    const certifications = await base44.entities.Certification.filter({ applicant_email: userEmail });
    const notificationPrefs = await base44.entities.NotificationPreference.filter({ user_email: userEmail });

    const getPreference = (eventType) => {
      return notificationPrefs.find(p => p.event_type === eventType) || 
             { email_enabled: true, push_enabled: true, sms_enabled: false };
    };

    const sendNotification = async (eventType, title, message) => {
      const pref = getPreference(eventType);
      
      if (pref.push_enabled) {
        await base44.entities.InAppNotification.create({
          user_email: userEmail,
          title,
          message,
          event_type: eventType,
          severity: eventType.includes('expiring') ? 'warning' : 'info'
        });
      }

      if (pref.email_enabled) {
        await base44.integrations.Core.SendEmail({
          to: userEmail,
          subject: title,
          body: message
        });
      }
    };

    // Verificar empréstimos aprovados
    for (const loan of greenLoans) {
      if (loan.status === 'Aprovado') {
        const key = `loan_approved_${loan.id}`;
        if (!localStorage.getItem(key)) {
          await sendNotification(
            'green_loan_status',
            'Empréstimo Verde Aprovado!',
            `Seu empréstimo de R$ ${loan.approved_amount?.toLocaleString('pt-BR')} foi aprovado!`
          );
          localStorage.setItem(key, 'true');
        }
      }
    }

    // Verificar incentivos aprovados
    for (const incentive of taxIncentives) {
      if (incentive.application_status === 'Aprovado') {
        const key = `incentive_approved_${incentive.id}`;
        if (!localStorage.getItem(key)) {
          await sendNotification(
            'tax_incentive_status',
            'Incentivo Fiscal Aprovado!',
            `Seu incentivo fiscal ${incentive.incentive_name} foi aprovado!`
          );
          localStorage.setItem(key, 'true');
        }
      }
    }

    // Verificar certificações obtidas
    for (const cert of certifications) {
      if (cert.status === 'Certificado') {
        const key = `cert_approved_${cert.id}`;
        if (!localStorage.getItem(key)) {
          await sendNotification(
            'certification_status',
            'Certificação Obtida!',
            `Parabéns! Sua certificação ${cert.certification_type} foi obtida!`
          );
          localStorage.setItem(key, 'true');
        }
      }
    }

    // Verificar datas de vencimento
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const cert of certifications) {
      if (cert.expiration_date) {
        const expirationDate = new Date(cert.expiration_date);
        if (expirationDate > today && expirationDate <= thirtyDaysFromNow) {
          const key = `cert_expiring_${cert.id}`;
          if (!localStorage.getItem(key)) {
            const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
            await sendNotification(
              'expiring_certification',
              'Certificação Vencendo em Breve',
              `Sua certificação ${cert.certification_type} vencerá em ${daysLeft} dias`
            );
            localStorage.setItem(key, 'true');
          }
        }
      }
    }

    for (const incentive of taxIncentives) {
      if (incentive.validity_end) {
        const endDate = new Date(incentive.validity_end);
        if (endDate > today && endDate <= thirtyDaysFromNow) {
          const key = `incentive_expiring_${incentive.id}`;
          if (!localStorage.getItem(key)) {
            const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            await sendNotification(
              'expiring_incentive',
              'Prazo de Incentivo Fiscal Vencendo',
              `O prazo para ${incentive.incentive_name} vencerá em ${daysLeft} dias`
            );
            localStorage.setItem(key, 'true');
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao verificar notificações:', error);
    return { success: false, error };
  }
}