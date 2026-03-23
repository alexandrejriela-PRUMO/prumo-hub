import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const FOCUSNFE_TOKEN = Deno.env.get('FOCUSNFE_API_KEY');
const FOCUSNFE_BASE_URL = 'https://api.focusnfe.com.br';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { charge_id, tomador } = await req.json();

    // Busca a cobrança
    const charges = await base44.entities.ConsultorCharge.filter({ id: charge_id });
    const charge = charges[0];
    if (!charge) return Response.json({ error: 'Cobrança não encontrada' }, { status: 404 });
    if (charge.consultor_email !== user.email) return Response.json({ error: 'Sem permissão' }, { status: 403 });

    // Verifica dados obrigatórios do consultor
    if (!user.nfe_cnpj || !user.nfe_inscricao_municipal) {
      return Response.json({
        error: 'Dados fiscais incompletos. Configure o CNPJ e a Inscrição Municipal nas configurações de pagamento.'
      }, { status: 400 });
    }

    const referencia = `PRUMO-${charge_id.substring(0, 12)}-${Date.now()}`;

    await base44.entities.ConsultorCharge.update(charge_id, { nfe_status: 'Emitindo', nfe_reference: referencia });

    const nfsePayload = {
      data_emissao: new Date().toISOString(),
      prestador: {
        cnpj: user.nfe_cnpj.replace(/\D/g, ''),
        inscricao_municipal: user.nfe_inscricao_municipal,
        codigo_municipio: user.nfe_codigo_municipio || '3550308',
      },
      tomador: {
        cpf: tomador.cpf ? tomador.cpf.replace(/\D/g, '') : undefined,
        cnpj: tomador.cnpj ? tomador.cnpj.replace(/\D/g, '') : undefined,
        razao_social: tomador.razao_social,
        email: tomador.email || charge.client_email,
        telefone: tomador.telefone || '',
        endereco: {
          logradouro: tomador.logradouro || '',
          numero: tomador.numero || 'S/N',
          complemento: tomador.complemento || '',
          bairro: tomador.bairro || '',
          codigo_municipio: tomador.codigo_municipio || user.nfe_codigo_municipio || '3550308',
          uf: tomador.uf || 'SP',
          cep: tomador.cep ? tomador.cep.replace(/\D/g, '') : '01310100',
        },
      },
      servico: {
        aliquota: user.nfe_aliquota || 5.0,
        base_calculo: charge.amount,
        discriminacao: charge.description,
        iss_retido: false,
        item_lista_servico: user.nfe_item_lista_servico || '1401',
        valor_servicos: charge.amount,
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
    console.log('Focus NFe response:', JSON.stringify(result));

    if (res.ok || res.status === 202) {
      await base44.entities.ConsultorCharge.update(charge_id, {
        nfe_status: 'Emitida',
        nfe_number: result.numero || referencia,
        nfe_url: result.caminho_xml_nota_fiscal || result.caminho_danfe || '',
      });
      return Response.json({ success: true, nfe: result });
    } else {
      await base44.entities.ConsultorCharge.update(charge_id, { nfe_status: 'Erro' });
      return Response.json({ error: result.mensagem || 'Erro ao emitir NF-e', details: result }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});