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

    // Buscar contas financeiras para validar
    const accounts = await base44.entities.FinancialAccount.filter({
      consultor_email,
    });

    for (const service of services) {
      console.log(`[syncInstallments] Processando serviço: ${service.name}, tipo: ${service.payment_type}, received: ${service.received}`);
      
      // Processar serviços à vista recebidos
      if (service.payment_type === 'avista' && service.received && service.received_at) {
        const dateStr = service.received_at.split('T')[0];
        const description = `${service.name}`;

        const exists = existingExpenses.some(exp => 
          exp.description === description && 
          exp.date === dateStr &&
          Math.abs(parseFloat(exp.amount) - service.value) < 0.01
        );

        if (!exists) {
          let accountName = service.account_name || '';
          let accountId = service.account_id || '';
          
          if (accountId && !accountName) {
            const acc = accounts.find(a => a.id === accountId);
            accountName = acc?.name || '';
          }

          const transaction = await base44.entities.Expense.create({
            consultor_email,
            description,
            amount: service.value,
            date: dateStr,
            competencia: dateStr,
            transaction_type: 'receita',
            category: 'Cobran\u00e7a de Cliente (Manual)',
            account_id: accountId,
            account_name: accountName,
            client_name: crm.client_name,
            client_property_id: clientPropertyId,
            status: 'Pago',
            payment_method: service.payment_method || 'Pix',
            notes: `Serviço "${service.name}"`,
          });
          createdTransactions.push(transaction);
        }
      }
      
      // Processar serviços parcelados
      const installments = service.installments_data || service.installments || [];
      if (service.payment_type === 'parcelado' && installments.length > 0) {
        for (let idx = 0; idx < installments.length; idx++) {
          const inst = installments[idx];
          
          // Só criar transação se parcela foi recebida e tem data de recebimento
          console.log(`[syncInstallments] Parcela ${inst.number}: received=${inst.received}, received_date=${inst.received_date}, amount=${inst.amount}, account_id=${inst.account_id}, account_name=${inst.account_name}`);
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
              // Determinar account_name: usar da parcela, depois do serviço, depois validar pelo account_id
              let accountName = inst.account_name || service.account_name || '';
              let accountId = inst.account_id || service.account_id || '';
              
              // Se tem account_id mas não tem account_name, buscar o nome
              if (accountId && !accountName) {
                const acc = accounts.find(a => a.id === accountId);
                accountName = acc?.name || '';
              }
              
              // Criar transação com dados específicos da parcela
              const transaction = await base44.entities.Expense.create({
                consultor_email,
                description,
                amount: inst.amount,
                date: dateStr,
                competencia: dateStr,
                transaction_type: 'receita',
                category: 'Cobran\u00e7a de Cliente (Manual)',
                account_id: accountId,
                account_name: accountName,
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