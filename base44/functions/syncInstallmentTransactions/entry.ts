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

    // Buscar transações existentes para esta CRM
    const existingExpenses = await base44.entities.Expense.filter({
      consultor_email,
      client_property_id: crm.property_id,
    });

    for (const service of services) {
      if (service.payment_type === 'parcelado' && service.installments_data?.length > 0) {
        const installmentValue = parseFloat(service.value) / (service.installments_data.length || 1);

        for (let idx = 0; idx < service.installments_data.length; idx++) {
          const inst = service.installments_data[idx];
          
          // Só criar transação se a parcela foi recebida e tem data de recebimento
          if (inst.received && inst.received_at) {
            const transactionDate = new Date(inst.received_at);
            const dateStr = transactionDate.toISOString().split('T')[0];
            const description = `${service.name} - Parcela ${idx + 1}/${service.installments_data.length}`;

            // Verificar se a transação já existe
            const exists = existingExpenses.some(exp => 
              exp.description === description && 
              exp.date === dateStr &&
              Math.abs(parseFloat(exp.amount) - installmentValue) < 0.01
            );

            if (!exists) {
              // Criar transação
              const transaction = await base44.entities.Expense.create({
                consultor_email,
                description,
                amount: installmentValue,
                date: dateStr,
                competencia: dateStr,
                transaction_type: 'receita',
                category: 'Cobran\u00e7a de Cliente (Manual)',
                account_name: service.payment_method || 'Pix',
                client_name: crm.client_name,
                client_property_id: crm.property_id,
                status: 'Pago',
                payment_method: service.payment_method || 'Pix',
                notes: `Parcela ${idx + 1}/${service.installments_data.length} de "${service.name}"`,
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