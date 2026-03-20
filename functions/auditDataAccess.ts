/**
 * auditDataAccess — Auditoria completa de isolamento de dados
 *
 * Valida que:
 * - Produtores veem APENAS suas propriedades/documentos
 * - Consultores veem APENAS suas propriedades + equipe
 * - Sem cruzamento ou conflito de dados
 * - Detecta duplicatas e inconsistências
 *
 * Payload:
 * {
 *   "audit_type": "producer" | "consultant" | "full",
 *   "user_email": "optativo - se não informar, usa usuário autenticado",
 *   "repair": false (se true, tenta corrigir automaticamente)
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    if (!currentUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { audit_type = 'full', user_email, repair = false } = body;

    // Se não informar email, auditoria é do usuário autenticado
    const targetEmail = user_email || currentUser.email;
    
    console.log(`🔍 [AUDIT] Iniciando auditoria tipo="${audit_type}" | usuário="${targetEmail}" | repair=${repair}`);

    // Buscar usuário alvo
    const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
    if (users.length === 0) {
      return Response.json({ error: `Usuário ${targetEmail} não encontrado` }, { status: 404 });
    }

    const targetUser = users[0];
    const auditReport = {
      user_email: targetEmail,
      user_type: targetUser.user_type,
      timestamp: new Date().toISOString(),
      checks: {},
      issues: [],
      repairs: [],
      summary: {}
    };

    // ─────────────────────────────────────────────────────────────────
    // PRODUTOR
    // ─────────────────────────────────────────────────────────────────
    if ((audit_type === 'producer' || audit_type === 'full') && targetUser.user_type === 'produtor') {
      console.log(`\n📋 [AUDIT] Auditando PRODUTOR: ${targetEmail}`);
      
      // 1. Propriedades do produtor
      const properties = await base44.asServiceRole.entities.Property.filter({
        owner_email: targetEmail
      });
      console.log(`   ✓ ${properties.length} propriedades encontradas`);

      // 2. Documentos do produtor
      const documents = await base44.asServiceRole.entities.Document.filter({
        owner_email: targetEmail
      });
      console.log(`   ✓ ${documents.length} documentos encontrados`);

      // 3. Licenças do produtor
      const licenses = await base44.asServiceRole.entities.License.filter({
        owner_email: targetEmail
      });
      console.log(`   ✓ ${licenses.length} licenças encontradas`);

      // 4. Contratos relacionados a propriedades do produtor
      const allContracts = await base44.asServiceRole.entities.ClientContract.filter({});
      const producerContracts = allContracts.filter(c => {
        return properties.some(p => p.id === c.property_id);
      });
      console.log(`   ✓ ${producerContracts.length} contratos vinculados`);

      // ───────────────────────────────────────────────────────────────
      // VERIFICAÇÕES DE INTEGRIDADE
      // ───────────────────────────────────────────────────────────────

      // CHECK 1: Documentos órfãos (vinculados a propriedade que não existe)
      const orphanDocs = documents.filter(d => {
        if (!d.property_id) return false; // documentos sem property_id são OK
        return !properties.some(p => p.id === d.property_id);
      });
      if (orphanDocs.length > 0) {
        auditReport.issues.push({
          severity: 'high',
          type: 'orphan_documents',
          count: orphanDocs.length,
          detail: `Documentos vinculados a propriedades inexistentes`,
          docs: orphanDocs.map(d => ({ id: d.id, property_id: d.property_id }))
        });
        console.warn(`   ⚠️  ${orphanDocs.length} documentos órfãos detectados`);
        
        if (repair) {
          for (const doc of orphanDocs) {
            await base44.asServiceRole.entities.Document.update(doc.id, {
              property_id: null
            });
            auditReport.repairs.push({ type: 'orphan_doc_cleared', doc_id: doc.id });
          }
          console.log(`   ✅ Reparado: ${orphanDocs.length} documentos órfãos limpos`);
        }
      }

      // CHECK 2: Licenças órfãs
      const orphanLicenses = licenses.filter(l => {
        if (!l.property_id) return false;
        return !properties.some(p => p.id === l.property_id);
      });
      if (orphanLicenses.length > 0) {
        auditReport.issues.push({
          severity: 'high',
          type: 'orphan_licenses',
          count: orphanLicenses.length,
          licenses: orphanLicenses.map(l => ({ id: l.id, property_id: l.property_id }))
        });
        console.warn(`   ⚠️  ${orphanLicenses.length} licenças órfãs detectadas`);
      }

      // CHECK 3: Duplicatas de propriedades (mesmo nome e localização)
      const propertyGroups = {};
      properties.forEach(p => {
        const key = `${p.property_name}_${p.city}_${p.state}`.toLowerCase();
        if (!propertyGroups[key]) propertyGroups[key] = [];
        propertyGroups[key].push(p);
      });

      const duplicateProperties = Object.entries(propertyGroups)
        .filter(([_, props]) => props.length > 1)
        .map(([key, props]) => ({ key, properties: props }));

      if (duplicateProperties.length > 0) {
        auditReport.issues.push({
          severity: 'medium',
          type: 'duplicate_properties',
          count: duplicateProperties.length,
          duplicates: duplicateProperties
        });
        console.warn(`   ⚠️  ${duplicateProperties.length} possíveis duplicatas de propriedades`);
      }

      // CHECK 4: Documentos duplicados
      const docGroups = {};
      documents.forEach(d => {
        const key = `${d.document_type}_${d.property_id || 'no-prop'}`.toLowerCase();
        if (!docGroups[key]) docGroups[key] = [];
        docGroups[key].push(d);
      });

      const duplicateDocs = Object.entries(docGroups)
        .filter(([_, docs]) => docs.length > 1)
        .map(([key, docs]) => ({ key, documents: docs }));

      if (duplicateDocs.length > 0) {
        auditReport.issues.push({
          severity: 'low',
          type: 'duplicate_documents',
          count: duplicateDocs.length,
          note: 'Múltiplas versões são normais — verificar se há desatualização'
        });
        console.log(`   ℹ️  ${duplicateDocs.length} grupos de documentos duplicados (pode ser versões)`);
      }

      // CHECK 5: Integridade de referências (Contracts)
      const badContracts = producerContracts.filter(c => 
        !c.client_email || !c.consultor_email || !c.contract_type
      );
      if (badContracts.length > 0) {
        auditReport.issues.push({
          severity: 'high',
          type: 'invalid_contracts',
          count: badContracts.length,
          detail: 'Contratos com campos obrigatórios faltando'
        });
        console.warn(`   ⚠️  ${badContracts.length} contratos com dados incompletos`);
      }

      auditReport.checks.producer = {
        total_properties: properties.length,
        total_documents: documents.length,
        total_licenses: licenses.length,
        total_contracts: producerContracts.length,
        orphan_documents: orphanDocs.length,
        orphan_licenses: orphanLicenses.length,
        duplicate_properties: duplicateProperties.length,
        duplicate_documents: duplicateDocs.length,
        invalid_contracts: badContracts.length
      };
    }

    // ─────────────────────────────────────────────────────────────────
    // CONSULTOR
    // ─────────────────────────────────────────────────────────────────
    if ((audit_type === 'consultant' || audit_type === 'full') && targetUser.user_type === 'consultor') {
      console.log(`\n📋 [AUDIT] Auditando CONSULTOR: ${targetEmail}`);

      // 1. Propriedades do consultor
      const consultorProperties = await base44.asServiceRole.entities.Property.filter({
        consultor_email: targetEmail
      });
      console.log(`   ✓ ${consultorProperties.length} propriedades diretas`);

      // 2. Membros da equipe
      const teamMembers = await base44.asServiceRole.entities.TeamMember.filter({
        primary_user_email: targetEmail,
        status: 'Ativo'
      });
      const teamMemberEmails = teamMembers.map(m => m.member_email);
      console.log(`   ✓ ${teamMembers.length} membros de equipe ativos`);

      // 3. Propriedades da equipe
      const teamProperties = await base44.asServiceRole.entities.Property.filter({
        consultor_email: undefined // placeholder para filtro OR
      });
      const allowedTeamProperties = teamProperties.filter(p => 
        teamMemberEmails.includes(p.consultor_email)
      );
      console.log(`   ✓ ${allowedTeamProperties.length} propriedades da equipe`);

      // 4. Documentos acessíveis do consultor e equipe
      const allDocuments = await base44.asServiceRole.entities.Document.filter({});
      const allProperties = consultorProperties.concat(allowedTeamProperties);
      const propertyIds = allProperties.map(p => p.id);
      
      const consultorDocs = allDocuments.filter(d => 
        d.owner_email === targetEmail || teamMemberEmails.includes(d.owner_email)
      );
      
      const accessibleDocs = consultorDocs.filter(d => 
        !d.property_id || propertyIds.includes(d.property_id)
      );
      console.log(`   ✓ ${accessibleDocs.length} documentos acessíveis`);

      // ───────────────────────────────────────────────────────────────
      // VERIFICAÇÕES DE INTEGRIDADE
      // ───────────────────────────────────────────────────────────────

      // CHECK 1: Propriedades não-autorizadas
      const unauthorizedProperties = consultorProperties.filter(p => 
        p.consultor_email !== targetEmail
      );
      if (unauthorizedProperties.length > 0) {
        auditReport.issues.push({
          severity: 'critical',
          type: 'unauthorized_properties',
          count: unauthorizedProperties.length,
          detail: 'Propriedades que não pertencem ao consultor'
        });
        console.error(`   ❌ ${unauthorizedProperties.length} propriedades não-autorizadas!`);
      }

      // CHECK 2: Membros inativos ainda tendo acesso
      const inactiveMembers = await base44.asServiceRole.entities.TeamMember.filter({
        primary_user_email: targetEmail,
        status: { $in: ['Inativo', 'Pendente'] }
      });
      const inactiveEmails = inactiveMembers.map(m => m.member_email);
      const docsByInactive = allDocuments.filter(d => 
        d.property_id && inactiveEmails.includes(d.consultor_email)
      );
      if (docsByInactive.length > 0) {
        auditReport.issues.push({
          severity: 'medium',
          type: 'inactive_member_access',
          count: docsByInactive.length,
          detail: 'Documentos acessíveis por membros inativos'
        });
        console.warn(`   ⚠️  ${docsByInactive.length} documentos de membros inativos`);
      }

      // CHECK 3: Contratos órfãos
      const consultorContracts = await base44.asServiceRole.entities.ClientContract.filter({
        consultor_email: targetEmail
      });
      const badContracts = consultorContracts.filter(c => 
        !allProperties.some(p => p.id === c.property_id)
      );
      if (badContracts.length > 0) {
        auditReport.issues.push({
          severity: 'high',
          type: 'orphan_contracts',
          count: badContracts.length,
          detail: 'Contratos vinculados a propriedades não-autorizadas'
        });
        console.warn(`   ⚠️  ${badContracts.length} contratos órfãos`);
      }

      auditReport.checks.consultant = {
        total_owned_properties: consultorProperties.length,
        total_team_members: teamMembers.length,
        total_team_properties: allowedTeamProperties.length,
        total_accessible_documents: accessibleDocs.length,
        unauthorized_properties: unauthorizedProperties.length,
        inactive_member_access: docsByInactive.length,
        orphan_contracts: badContracts.length
      };
    }

    // ─────────────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────────────
    const criticalIssues = auditReport.issues.filter(i => i.severity === 'critical');
    const highIssues = auditReport.issues.filter(i => i.severity === 'high');
    const mediumIssues = auditReport.issues.filter(i => i.severity === 'medium');

    auditReport.summary = {
      total_issues: auditReport.issues.length,
      critical: criticalIssues.length,
      high: highIssues.length,
      medium: mediumIssues.length,
      repairs_made: auditReport.repairs.length,
      status: criticalIssues.length > 0 ? 'FAILED' : highIssues.length > 0 ? 'WARNINGS' : 'PASSED'
    };

    console.log(`\n✅ [AUDIT] Auditoria concluída | Status: ${auditReport.summary.status} | Issues: ${auditReport.summary.total_issues}`);

    return Response.json(auditReport);

  } catch (error) {
    console.error('[auditDataAccess] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});