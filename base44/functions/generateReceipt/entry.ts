import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * generateReceipt — Cria um Receipt (recibo) usando service role.
 *
 * Necessário porque a RLS de Receipt exige consultor_email === user.email,
 * bloqueando membros de equipe que emitem recibos em nome do consultor principal.
 *
 * Recebe: { expense_id?, client_name, client_email, client_cpf_cnpj?, property_id?, property_name?,
 *           title?, services[], payment_method?, payment_date?, notes?, espelhar_documentos?, status? }
 * Retorna: { receipt_id, receipt_number }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      expense_id, client_name, client_email, client_cpf_cnpj, property_id, property_name,
      title, services, payment_method, payment_date, notes, espelhar_documentos, status,
    } = body;

    if (!client_name) return Response.json({ error: 'client_name é obrigatório' }, { status: 400 });
    if (!client_email) return Response.json({ error: 'client_email é obrigatório' }, { status: 400 });
    if (!Array.isArray(services) || services.length === 0) {
      return Response.json({ error: 'Informe ao menos um serviço' }, { status: 400 });
    }

    // Determinar o email efetivo do consultor
    let consultorEmail = user.email;
    if (user.role !== 'admin') {
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        status: 'Ativo',
      });
      if (memberships.length > 0) {
        consultorEmail = memberships[0].primary_user_email;
      }
    }

    const total_amount = services.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);

    // Numeração automática: REC-ANO-NNN, sequencial por ano dentro dos recibos do consultor
    const year = new Date().getFullYear();
    const existing = await base44.asServiceRole.entities.Receipt.filter({ consultor_email: consultorEmail });
    const countThisYear = existing.filter(r => (r.receipt_number || '').startsWith(`REC-${year}-`)).length;
    const receipt_number = `REC-${year}-${String(countThisYear + 1).padStart(3, '0')}`;

    const receipt = await base44.asServiceRole.entities.Receipt.create({
      consultor_email: consultorEmail,
      receipt_number,
      title: title || 'Recibo de Honorários',
      client_name,
      client_email,
      client_cpf_cnpj: client_cpf_cnpj || '',
      property_id: property_id || '',
      property_name: property_name || '',
      expense_id: expense_id || '',
      services,
      total_amount,
      payment_method: payment_method || 'PIX',
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      notes: notes || '',
      status: status === 'Emitido' ? 'Emitido' : 'Rascunho',
      espelhar_documentos: !!espelhar_documentos,
    });

    if (expense_id) {
      await base44.asServiceRole.entities.Expense.update(expense_id, { receipt_id: receipt.id });
    }

    if (espelhar_documentos) {
      const document = await base44.asServiceRole.entities.Document.create({
        owner_email: consultorEmail,
        property_id: property_id || undefined,
        document_type: 'Comprovante de Pagamento',
        document_name: `Recibo ${receipt_number} - ${client_name}`,
        notes: `Criado automaticamente do módulo financeiro (recibo ID: ${receipt.id})`,
        source: 'financeiro',
        source_id: receipt.id,
        current_version: 1,
        versions: [],
      });
      await base44.asServiceRole.entities.Receipt.update(receipt.id, { document_id: document.id });
    }

    return Response.json({ receipt_id: receipt.id, receipt_number });
  } catch (error) {
    console.error('[generateReceipt] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
