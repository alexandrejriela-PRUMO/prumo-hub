import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * deleteLicenseCascade — Exclui uma licença em cascata:
 * 1. Exclui o License
 * 2. Encontra e exclui o ProjectChecklist associado (entity_type='License', entity_id)
 * 3. Remove do ClientCRM as tarefas e interações geradas pelo checklist
 *    (identificadas pelo prefixo "📋" no título e menção ao checklist)
 *
 * Body:
 *   - license_id: ID da licença
 *   - property_id: ID da propriedade (opcional, mas recomendado)
 *   - consultor_email: Email do consultor (opcional, para busca do CRM)
 *   - owner_email: Email do proprietário (opcional, para busca do CRM)
 *   - license_label: Label da licença (ex: "LI - Licença de Instalação Nº 001/2024")
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { license_id, property_id, consultor_email, owner_email, license_label } = body;

    if (!license_id) {
      return Response.json({ error: 'license_id é obrigatório' }, { status: 400 });
    }

    // Resolve effective consultant email
    let effectiveConsultor = consultor_email || user.email;
    if (!consultor_email && user.role !== 'admin') {
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        status: 'Ativo',
      });
      if (memberships.length > 0) {
        effectiveConsultor = memberships[0].primary_user_email;
      }
    }

    // Busca a licença para obter dados se não fornecidos
    let license = null;
    try {
      license = await base44.asServiceRole.entities.License.get(license_id);
    } catch {}
    if (!license) {
      return Response.json({ error: 'Licença não encontrada' }, { status: 404 });
    }

    const finalPropertyId = property_id || license.property_id;
    const finalOwnerEmail = owner_email || license.owner_email;
    const finalConsultorEmail = effectiveConsultor;
    const finalLicenseLabel = license_label || `${license.license_type}${license.license_number ? ' Nº ' + license.license_number : ''}`;

    // 1. Encontrar o ProjectChecklist associado à licença
    const checklists = await base44.asServiceRole.entities.ProjectChecklist.filter({
      entity_type: 'License',
      entity_id: license_id,
    });

    const checklist = checklists[0] || null;
    const checklistItemTitles = checklist?.items?.map((item) => item.title) || [];

    // 2. Encontrar o ClientCRM correspondente
    let crmMatch = null;
    if (finalPropertyId || finalOwnerEmail || finalConsultorEmail) {
      const crmList = await base44.asServiceRole.entities.ClientCRM.filter({
        consultor_email: finalConsultorEmail,
      });

      crmMatch =
        (finalPropertyId ? crmList.find((c) => c.property_id === finalPropertyId) : null) ||
        (finalOwnerEmail ? crmList.find((c) => c.client_email === finalOwnerEmail) : null) ||
        (finalOwnerEmail ? crmList.find((c) => c.client_email === finalOwnerEmail) : null) ||
        crmList[0] ||
        null;
    }

    // 3. Remover do CRM as tarefas e interações geradas pelo checklist
    if (crmMatch && checklistItemTitles.length > 0) {
      try {
        const freshList = await base44.asServiceRole.entities.ClientCRM.filter({ id: crmMatch.id });
        const freshCRM = freshList?.[0] || crmMatch;

        // Filtra tarefas: remove aquelas cujo título é "📋 {itemTitle}" de um checklist item
        const updatedTasks = (freshCRM.tasks || []).filter((task) => {
          if (!task.title || !task.title.startsWith('📋 ')) return true;
          const taskItemTitle = task.title.substring(2); // remove "📋 "
          // Mantém se não corresponde a nenhum item do checklist excluído
          return !checklistItemTitles.includes(taskItemTitle);
        });

        // Filtra interações: remove aquelas cujo título contém "— Checklist:" e corresponde a um item
        const updatedInteractions = (freshCRM.interactions || []).filter((interaction) => {
          if (!interaction.title || !interaction.title.startsWith('📋 ')) return true;
          if (!interaction.title.includes('— Checklist:')) return true;
          // Extrai o itemTitle da interação (formato: "📋 {itemTitle} — Checklist: {licenseLabel}")
          const titlePart = interaction.title.split(' — Checklist:')[0];
          const itemTitle = titlePart.substring(2); // remove "📋 "
          return !checklistItemTitles.includes(itemTitle);
        });

        await base44.asServiceRole.entities.ClientCRM.update(crmMatch.id, {
          tasks: updatedTasks,
          interactions: updatedInteractions,
        });
      } catch (e) {
        console.warn('[deleteLicenseCascade] Erro ao limpar CRM (não crítico):', e.message);
      }
    }

    // 4. Excluir o ProjectChecklist
    if (checklist) {
      try {
        await base44.asServiceRole.entities.ProjectChecklist.delete(checklist.id);
      } catch (e) {
        console.warn('[deleteLicenseCascade] Erro ao excluir checklist (não crítico):', e.message);
      }
    }

    // 5. Excluir a License
    await base44.asServiceRole.entities.License.delete(license_id);

    return Response.json({
      success: true,
      deleted: {
        license: true,
        checklist: !!checklist,
        crm_tasks_removed: checklistItemTitles.length,
        crm_interactions_removed: checklistItemTitles.length,
      },
    });
  } catch (error) {
    console.error('[deleteLicenseCascade] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});