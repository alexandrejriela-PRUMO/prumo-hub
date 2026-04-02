import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { crmId, consultor_email } = await req.json();

    // Buscar o ClientCRM
    const crms = await base44.entities.ClientCRM.filter({ id: crmId });
    const crm = crms[0];
    
    if (!crm || crm.consultor_email !== consultor_email) {
      return Response.json({ error: 'ClientCRM not found or unauthorized' }, { status: 403 });
    }

    const services = crm.services || [];
    const createdTransactions = [];

    // Identificar o client_property_id correto
    const clientPropertyId = crm.property_id || crm.id;
    console.log(`[syncInstallments] ClientCRM ID: ${crm.id}, property_id: ${crm.property_id}, usando: ${clientPropertyId}`);

    // Buscar transações existentes para esta CRM
    const existingExpenses = await base44.entities.Expense.filter({
      consultor_email,
      client_property_id: clientPropertyId,
    });

    for (const service of services) {
      const installments = service.installments_data || service.installments || [];
      console.log(`[syncInstallments] Processando serviço: ${service.name}, tipo: ${service.payment_type}, parcelas: ${installments.length}`);
      if (service.payment_type === 'parcelado' && installments.length > 0) {
        for (let idx = 0; idx < installments.length; idx++) {
          const inst = installments[idx];
          
          // Só criar transação se parcela foi recebida e tem data de recebimento
          console.log(`[syncInstallments] Parcela ${inst.number}: received=${inst.received}, received_date=${inst.received_date}, amount=${inst.amount}`);
          if (inst.received && inst.received_date) {
            const dateStr = inst.received_date;
            const description = `${service.name} - Parcela ${inst.number}/${installments.length}`;

            // Verificar se a transação já existe
            const exists = existingExpenses.some(exp => 
              exp.description === description && 
              exp.date === dateStr &&
              Math.abs(parseFloat(exp.amount) - inst.amount) < 0.01
            );

            if (!exists) {
              // Criar transação com dados específicos da parcela se disponível, senão usar dados do serviço
              const transaction = await base44.entities.Expense.create({
                consultor_email,
                description,
                amount: inst.amount,
                date: dateStr,
                competencia: dateStr,
                transaction_type: 'receita',
                category: 'Cobran\u00e7a de Cliente (Manual)',
                account_name: inst.account_name || service.account_name || '',
                client_name: crm.client_name,
                client_property_id: clientPropertyId,
                status: 'Pago',
                payment_method: inst.payment_method || service.payment_method || 'Pix',
                notes: `Parcela ${inst.number}/${installments.length} de "${service.name}"`,
              });
              createdTransactions.push(transaction);
            }
          }
        }
      }
    }

    return Response.json({
      success: true,
      transactionsCreated: createdTransactions.length,
      transactions: createdTransactions,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});