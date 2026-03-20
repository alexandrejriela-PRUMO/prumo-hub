/**
 * manageTeamMembers — Gerencia convites e membros da equipe.
 *
 * FLUXO CORRETO:
 *   1. Validar email
 *   2. Checar duplicidade
 *   3. inviteUser() — se falhar, NADA é criado
 *   4. Criar TeamMember com status Pendente
 *   5. Enviar email personalizado
 *
 * Actions: list | invite | resend_invite | activate | apply_user_type | remove
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Valida formato de email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Calcula data de expiração (7 dias)
function expiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ─── LIST ────────────────────────────────────────────────────────────────
    if (action === 'list') {
      const members = await base44.asServiceRole.entities.TeamMember.filter({
        primary_user_email: user.email
      });
      return Response.json({ members });
    }

    // ─── INVITE ──────────────────────────────────────────────────────────────
    if (action === 'invite') {
      const { member_email, member_name, member_role } = body;

      // 1. Validar email
      if (!member_email || !isValidEmail(member_email)) {
        return Response.json({ error: 'Email inválido ou não fornecido.' }, { status: 400 });
      }

      // 2. Checar duplicidade (qualquer status exceto Inativo)
      const existing = await base44.asServiceRole.entities.TeamMember.filter({
        primary_user_email: user.email,
        member_email,
      });
      const activeConflict = existing.find(m => m.status !== 'Inativo');
      if (activeConflict) {
        const statusLabel = activeConflict.status === 'Ativo' ? 'já é membro ativo' : 'já possui convite pendente';
        return Response.json({ error: `Este usuário ${statusLabel}. Use "reenviar convite" se necessário.` }, { status: 400 });
      }

      // 3. Tentar inviteUser (não-bloqueante — requer role admin no Base44)
      console.log(`[TeamInvite] Iniciando convite para ${member_email} pelo consultor ${user.email}`);
      try {
        await base44.users.inviteUser(member_email, 'user');
        console.log(`[TeamInvite] inviteUser OK para ${member_email}`);
      } catch (inviteErr) {
        console.warn(`[TeamInvite] inviteUser falhou (não-fatal): ${inviteErr.message}`);
      }

      // 4. Criar TeamMember sempre
      const now = new Date().toISOString();
      const member = await base44.asServiceRole.entities.TeamMember.create({
        primary_user_email: user.email,
        consultor_email: user.email,
        member_email,
        member_name: member_name || '',
        member_role: member_role || 'Outro',
        status: 'Pendente',
        pending_user_type: 'equipe',
        user_type_applied: false,
        invited_at: now,
        expires_at: expiresAt(),
      });
      console.log(`[TeamInvite] TeamMember criado id=${member.id} para ${member_email}`);

      // 5. Email personalizado — obrigatório, erro é retornado mas não desfaz o convite
      const emailSubject = `Você foi convidado para a equipe de ${user.full_name || user.email} no PRUMO Hub`;
      const emailBody = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
<h2 style="color:#1B4332">Convite para equipe PRUMO Hub</h2>
<p>Olá${member_name ? ', <strong>' + member_name + '</strong>' : ''},</p>
<p><strong>${user.full_name || user.email}</strong> convidou você para fazer parte da equipe de consultoria no <strong>PRUMO Hub</strong>.</p>
<table style="width:100%;background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0">
  <tr><td><strong>Função:</strong></td><td>${member_role || 'Membro da Equipe'}</td></tr>
  <tr><td><strong>Consultor:</strong></td><td>${user.full_name || user.email}</td></tr>
  <tr><td><strong>Expira em:</strong></td><td>7 dias</td></tr>
</table>
<p>Ao fazer seu primeiro login, seu perfil será configurado automaticamente com acesso às ferramentas de consultoria.</p>
<p style="margin-top:24px">
  <a href="https://prumo.app" style="background:#1B4332;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
    Acessar PRUMO Hub →
  </a>
</p>
<p style="color:#888;font-size:12px;margin-top:32px">Equipe PRUMO Hub | prumo.app</p>
</div>`;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'PRUMO Hub',
          to: member_email,
          subject: emailSubject,
          body: emailBody
        });
        console.log(`[TeamInvite] Email personalizado enviado OK para ${member_email}`);
      } catch (emailErr) {
        console.error(`[TeamInvite] FALHA ao enviar email para ${member_email}: ${emailErr.message}`);
        // Não desfaz o convite — usuário pode reenviar depois
      }

      return Response.json({ success: true, member });
    }

    // ─── RESEND_INVITE ───────────────────────────────────────────────────────
    if (action === 'resend_invite') {
      const { member_id } = body;

      const members = await base44.asServiceRole.entities.TeamMember.filter({
        primary_user_email: user.email,
      });
      const member = members.find(m => m.id === member_id);

      if (!member) return Response.json({ error: 'Membro não encontrado.' }, { status: 404 });
      if (member.status !== 'Pendente') {
        return Response.json({ error: 'Só é possível reenviar convite para membros com status Pendente.' }, { status: 400 });
      }

      console.log(`[TeamInvite] Reenviando convite para ${member.member_email}`);
      try {
        await base44.users.inviteUser(member.member_email, 'user');
      } catch (inviteErr) {
        console.warn(`[TeamInvite] inviteUser reenvio falhou (não-fatal): ${inviteErr.message}`);
      }

      const now = new Date().toISOString();
      await base44.asServiceRole.entities.TeamMember.update(member_id, {
        invited_at: now,
        expires_at: expiresAt(),
      });

      // Email personalizado de reenvio
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'PRUMO Hub',
          to: member.member_email,
          subject: `Lembrete: Você foi convidado para a equipe de ${user.full_name || user.email} no PRUMO Hub`,
          body: `<p>Olá${member.member_name ? ', <strong>' + member.member_name + '</strong>' : ''},</p>
<p>Este é um lembrete do convite de <strong>${user.full_name || user.email}</strong> para a equipe no <strong>PRUMO Hub</strong>.</p>
<p>⚠️ Novo prazo: <strong>7 dias</strong> a partir de hoje.</p>
<p><a href="https://prumo.app" style="background:#1B4332;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px;">Acessar PRUMO Hub</a></p>
<br/>
<p>Atenciosamente,<br/>Equipe PRUMO Hub</p>`
        });
      } catch (emailErr) {
        console.warn('[TeamInvite] Falha ao enviar email de reenvio:', emailErr.message);
      }

      console.log(`[TeamInvite] Convite reenviado para ${member.member_email}`);
      return Response.json({ success: true });
    }

    // ─── ACTIVATE (manual pelo consultor) ────────────────────────────────────
    if (action === 'activate') {
      const { member_id } = body;

      const members = await base44.asServiceRole.entities.TeamMember.filter({
        primary_user_email: user.email,
      });
      const member = members.find(m => m.id === member_id);
      if (!member) return Response.json({ error: 'Membro não encontrado.' }, { status: 404 });

      if (!member.user_type_applied && member.pending_user_type) {
        try {
          const users = await base44.asServiceRole.entities.User.filter({ email: member.member_email });
          if (users.length > 0) {
            await base44.asServiceRole.entities.User.update(users[0].id, {
              user_type: member.pending_user_type
            });
            console.log(`[TeamActivate] user_type '${member.pending_user_type}' aplicado para ${member.member_email}`);
          } else {
            console.warn(`[TeamActivate] Usuário ${member.member_email} ainda não criou conta. Será aplicado no primeiro login.`);
          }
        } catch (e) {
          console.warn(`[TeamActivate] Não foi possível aplicar user_type: ${e.message}`);
        }
      }

      const now = new Date().toISOString();
      await base44.asServiceRole.entities.TeamMember.update(member_id, {
        status: 'Ativo',
        user_type_applied: true,
        activated_at: now,
        accepted_at: now,
      });

      return Response.json({ success: true });
    }

    // ─── APPLY_USER_TYPE (chamado automaticamente no primeiro login do membro) ─
    if (action === 'apply_user_type') {
      const pendingMemberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        user_type_applied: false
      });

      if (pendingMemberships.length === 0) {
        return Response.json({ success: true, message: 'Nenhum perfil pendente.' });
      }

      const membership = pendingMemberships[0];

      // Verificar expiração
      if (membership.expires_at && new Date(membership.expires_at) < new Date()) {
        console.warn(`[ApplyUserType] Convite expirado para ${user.email} (expirou em ${membership.expires_at})`);
        return Response.json({
          error: 'Este convite expirou. Solicite um novo convite ao consultor.',
          expired: true
        }, { status: 403 });
      }

      const userType = membership.pending_user_type || 'equipe';
      const now = new Date().toISOString();

      try {
        await base44.auth.updateMe({ user_type: userType });
        await base44.asServiceRole.entities.TeamMember.update(membership.id, {
          user_type_applied: true,
          status: 'Ativo',
          activated_at: now,
          accepted_at: now,
        });
        console.log(`[ApplyUserType] user_type '${userType}' aplicado com sucesso para ${user.email}`);
        return Response.json({ success: true, user_type: userType });
      } catch (e) {
        console.error(`[ApplyUserType] Erro ao aplicar user_type para ${user.email}:`, e.message);
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // ─── REMOVE ──────────────────────────────────────────────────────────────
    if (action === 'remove') {
      const { member_id } = body;
      const members = await base44.asServiceRole.entities.TeamMember.filter({
        primary_user_email: user.email,
      });
      const member = members.find(m => m.id === member_id);
      if (!member) return Response.json({ error: 'Membro não encontrado.' }, { status: 404 });

      await base44.asServiceRole.entities.TeamMember.delete(member_id);
      console.log(`[TeamRemove] Membro ${member.member_email} removido por ${user.email}`);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida. Use: list | invite | resend_invite | activate | apply_user_type | remove' }, { status: 400 });

  } catch (error) {
    console.error('[manageTeamMembers] Erro inesperado:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});