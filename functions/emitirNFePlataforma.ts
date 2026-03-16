import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const FOCUSNFE_TOKEN = Deno.env.get('FOCUSNFE_API_KEY');
const FOCUSNFE_BASE_URL = 'https://api.focusnfe.com.br';

// Dados fiscais da plataforma (emissor/prestador)
const PLATFORM_CNPJ = Deno.env.get('PLATFORM_NFE_CNPJ');
const PLATFORM_INSCRICAO_MUNICIPAL = Deno.env.get('PLATFORM_NFE_INSCRICAO_MUNICIPAL');
const PLATFORM_CODIGO_MUNICIPIO = Deno.env.get('PLATFORM_NFE_CODIGO_MUNICIPIO') || '3550308';
const PLATFORM_ITEM_LISTA_SERVICO = Deno.env.get('PLATFORM_NFE_ITEM_LISTA_SERVICO') || '1401';
const PLATFORM_ALIQUOTA = parseFloat(Deno.env.get('PLATFORM_NFE_ALIQUOTA') || '5');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Pode ser chamado por admin ou pelo webhook (service role)
    let callerIsAdmin = false;
    try {
      const user = await base44.auth.me();
      callerIsAdmin = user?.role === 'admin';
    } catch (_) {}

    const { invoice_id, tomador } = await req.json();

    if (!invoice_id) {
      return Response.json({ error: 'invoice_id obrigatório' }, { status: 400 });
    }

    if (!PLATFORM_CNPJ || !PLATFORM_INSCRICAO_MUNICIPAL) {
      return Response.json({
        error: 'Dados fiscais da plataforma não configurados. Configure PLATFORM_NFE_CNPJ e PLATFORM_NFE_INSCRICAO_MUNICIPAL.'
      }, { status: 400 });
    }

    // Busca a fatura
    const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
    const invoice = invoices[0];
    if (!invoice) return Response.json({ error: 'Fatura não encontrada' }, { status: 404 });

    if (invoice.nfe_status === 'Emitida') {
      return Response.json({ error: 'NF-e já emitida para esta fatura' }, { status: 400 });
    }

    const referencia = `PRUMO-PLAT-${invoice_id.substring(0, 10)}-${Date.now()}`;

    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      nfe_status: 'Emitindo',
      nfe_reference: referencia
    });

    // Tomador: dados do cliente que pagou o plano
    const tomadorData = tomador || {};
    const nfsePayload = {
      data_emissao: new Date().toISOString(),
      prestador: {
        cnpj: PLATFORM_CNPJ.replace(/\D/g, ''),
        inscricao_municipal: PLATFORM_INSCRICAO_MUNICIPAL,
        codigo_municipio: PLATFORM_CODIGO_MUNICIPIO,
      },
      tomador: {
        cpf: tomadorData.cpf ? tomadorData.cpf.replace(/\D/g, '') : undefined,
        cnpj: tomadorData.cnpj ? tomadorData.cnpj.replace(/\D/g, '') : undefined,
        razao_social: tomadorData.razao_social || tomadorData.full_name || invoice.client_email,
        email: tomadorData.email || invoice.client_email,
        telefone: tomadorData.telefone || '',
        endereco: {
          logradouro: tomadorData.logradouro || '',
          numero: tomadorData.numero || 'S/N',
          complemento: tomadorData.complemento || '',
          bairro: tomadorData.bairro || '',
          codigo_municipio: tomadorData.codigo_municipio || PLATFORM_CODIGO_MUNICIPIO,
          uf: tomadorData.uf || 'SP',
          cep: tomadorData.cep ? tomadorData.cep.replace(/\D/g, '') : '01310100',
        },
      },
      servico: {
        aliquota: PLATFORM_ALIQUOTA,
        base_calculo: invoice.amount,
        discriminacao: invoice.description || 'Assinatura Plataforma PRUMO Hub',
        iss_retido: false,
        item_lista_servico: PLATFORM_ITEM_LISTA_SERVICO,
        valor_servicos: invoice.amount,
      },
    };

    const authHeader = 'Basic ' + btoa(FOCUSNFE_TOKEN + ':');
    const res = await fetch(`${FOCUSNFE_BASE_URL}/v2/nfse?ref=${referencia}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(nfsePayload),
    });

    const result = await res.json();
    console.log('Focus NFe Plataforma response:', JSON.stringify(result));

    if (res.ok || res.status === 202) {
      await base44.asServiceRole.entities.Invoice.update(invoice_id, {
        nfe_status: 'Emitida',
        nfe_number: result.numero || referencia,
        nfe_url: result.caminho_xml_nota_fiscal || result.caminho_danfe || '',
      });
      return Response.json({ success: true, nfe: result });
    } else {
      await base44.asServiceRole.entities.Invoice.update(invoice_id, { nfe_status: 'Erro' });
      return Response.json({ error: result.mensagem || 'Erro ao emitir NF-e', details: result }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});