import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { crmId, consultor_email } = await req.json();

    // Buscar o ClientCRM atualizado
    const crms = await base44.entities.ClientCRM.filter({ id: crmId });
    const crm = crms[0];
    
    if (!crm || crm.consultor_email !== consultor_email) {
      return Response.json({ error: 'ClientCRM not found or unauthorized' }, { status: 403 });
    }

    const services = crm.services || [];
    const clientPropertyId = crm.property_id || crm.id;
    console.log(`[syncInstallments] CRM ID: ${crm.id}, property_id: ${clientPropertyId}, serviços: ${services.length}`);

    // Buscar transações existentes para esta CRM
    const existingExpenses = await base44.entities.Expense.filter({
      consultor_email,
      client_property_id: clientPropertyId,
    });

    // --- STEP 1: Construir o conjunto de descrições válidas dos serviços atuais ---
    const validDescriptions = new Set();
    for (const service of services) {
      if (service.payment_type === 'avista' && service.received && service.received_at) {
        validDescriptions.add(`${service.name}`);
      }
      const installments = (service.installments_data && service.installments_data.length > 0)
        ? service.installments_data
        : (service.installments || []);
      if (service.payment_type === 'parcelado' && installments.length > 0) {
        for (let idx = 0; idx < installments.length; idx++) {
          const inst = installments[idx];
          if (inst.received && inst.received_date) {
            validDescriptions.add(`${service.name} - Parcela ${inst.number}/${installments.length}`);
          }
        }
      }
    }

    // --- STEP 2: Apagar Expenses órfãs (serviço foi deletado ou desmarcado como recebido) ---
    const toDelete = existingExpenses.filter(exp => {
      const desc = exp.description || '';
      // Só apagar entradas sincronizadas (categoria específica) - aceitar unicode e utf-8
      const cat = exp.category || '';
      const isSynced = cat === 'Cobrança de Cliente (Manual)' || cat === 'Cobran\u00e7a de Cliente (Manual)';
      if (!isSynced) return false;
      // Apagar se a descrição não está mais no conjunto válido
      return !validDescriptions.has(desc);
    });

    if (toDelete.length > 0) {
      console.log(`[syncInstallments] Apagando ${toDelete.length} transações órfãs:`, toDelete.map(e => e.description));
      await Promise.all(toDelete.map(exp => base44.entities.Expense.delete(exp.id)));
    }

    // --- STEP 3: Criar transações para serviços recebidos que ainda não têm Expense ---
    const createdTransactions = [];

    // Recarregar lista após deleções
    const remainingExpenses = existingExpenses.filter(exp => !toDelete.find(d => d.id === exp.id));

    for (const service of services) {
      console.log("STEP 4 - SERVICE RECEBIDO:", JSON.stringify(service, null, 2));
      console.log("STEP 5 - ACCOUNT_ID NO BACKEND:", service.account_id);
      console.log(`[syncInstallments] Processando: ${service.name}, tipo: ${service.payment_type}, received: ${service.received}`);
      
      // À vista
      if (service.payment_type === 'avista' && service.received && service.received_at) {
        const dateStr = service.received_at.split('T')[0];
        const description = `${service.name}`;

        const existingMatch = remainingExpenses.find(exp => 
          exp.description === description && 
          exp.date === dateStr &&
          Math.abs(parseFloat(exp.amount) - service.value) < 0.01
        );

        if (!existingMatch) {
          console.log("STEP 6 - TRANSACTION CREATE (avista):", { account_id: service.account_id || null });
          const transaction = await base44.entities.Expense.create({
            consultor_email,
            description,
            amount: service.value,
            date: dateStr,
            competencia: dateStr,
            transaction_type: 'receita',
            category: 'Cobrança de Cliente (Manual)',
            account_id: service.account_id || null,
            client_name: crm.client_name,
            client_property_id: clientPropertyId,
            status: 'Pago',
            payment_method: service.payment_method || 'Pix',
            notes: `Serviço "${service.name}"`,
          });
          console.log("STEP 7 - TRANSACTION SALVA:", JSON.stringify(transaction, null, 2));
          createdTransactions.push(transaction);
        } else if (existingMatch.account_id !== (service.account_id || null)) {
          // Atualizar account_id se mudou
          console.log("STEP 6 - TRANSACTION UPDATE account_id (avista):", { old: existingMatch.account_id, new: service.account_id || null });
          await base44.entities.Expense.update(existingMatch.id, {
            account_id: service.account_id || null,
            payment_method: service.payment_method || 'Pix',
          });
        }
      }
      
      // Parcelado
      const installments2 = (service.installments_data && service.installments_data.length > 0)
        ? service.installments_data
        : (service.installments || []);
      if (service.payment_type === 'parcelado' && installments2.length > 0) {
        for (let idx = 0; idx < installments2.length; idx++) {
          const inst = installments2[idx];
          if (inst.received && inst.received_date) {
            const dateStr = inst.received_date;
            const description = `${service.name} - Parcela ${inst.number}/${installments2.length}`;

            const existingMatchP = remainingExpenses.find(exp => 
              exp.description === description && 
              exp.date === dateStr &&
              Math.abs(parseFloat(exp.amount) - inst.amount) < 0.01
            );

            if (!existingMatchP) {
              console.log("STEP 6 - TRANSACTION CREATE (parcelado):", { account_id: service.account_id || null });
              const transaction = await base44.entities.Expense.create({
                consultor_email,
                description,
                amount: inst.amount,
                date: dateStr,
                competencia: dateStr,
                transaction_type: 'receita',
                category: 'Cobrança de Cliente (Manual)',
                account_id: service.account_id || null,
                client_name: crm.client_name,
                client_property_id: clientPropertyId,
                status: 'Pago',
                payment_method: inst.payment_method || service.payment_method || 'Pix',
                notes: `Parcela ${inst.number}/${installments2.length} de "${service.name}"`,
              });
              console.log("STEP 7 - TRANSACTION SALVA:", JSON.stringify(transaction, null, 2));
              createdTransactions.push(transaction);
            } else if (existingMatchP.account_id !== (service.account_id || null)) {
              // Atualizar account_id se mudou
              console.log("STEP 6 - TRANSACTION UPDATE account_id (parcelado):", { old: existingMatchP.account_id, new: service.account_id || null });
              await base44.entities.Expense.update(existingMatchP.id, {
                account_id: service.account_id || null,
                payment_method: inst.payment_method || service.payment_method || 'Pix',
              });
            }
          }
        }
      }
    }

    return Response.json({
      success: true,
      deletedOrphans: toDelete.length,
      transactionsCreated: createdTransactions.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});