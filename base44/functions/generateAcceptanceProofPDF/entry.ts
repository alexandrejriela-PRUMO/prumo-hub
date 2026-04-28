import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.2';

// Normaliza caracteres especiais do português para compatibilidade com Helvetica no jsPDF
function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/[\u00C0-\u00C5]/g, 'A')
    .replace(/[\u00E0-\u00E5]/g, 'a')
    .replace(/[\u00C6]/g, 'AE')
    .replace(/[\u00E6]/g, 'ae')
    .replace(/[\u00C7]/g, 'C')
    .replace(/[\u00E7]/g, 'c')
    .replace(/[\u00C8-\u00CB]/g, 'E')
    .replace(/[\u00E8-\u00EB]/g, 'e')
    .replace(/[\u00CC-\u00CF]/g, 'I')
    .replace(/[\u00EC-\u00EF]/g, 'i')
    .replace(/[\u00D1]/g, 'N')
    .replace(/[\u00F1]/g, 'n')
    .replace(/[\u00D2-\u00D6\u00D8]/g, 'O')
    .replace(/[\u00F2-\u00F6\u00F8]/g, 'o')
    .replace(/[\u00D9-\u00DC]/g, 'U')
    .replace(/[\u00F9-\u00FC]/g, 'u')
    .replace(/[\u00DD]/g, 'Y')
    .replace(/[\u00FD\u00FF]/g, 'y')
    .replace(/[\u00E3]/g, 'a')
    .replace(/[\u00C3]/g, 'A')
    .replace(/[\u00F5]/g, 'o')
    .replace(/[\u00D5]/g, 'O')
    .replace(/[\u2019\u2018]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x00-\x7F]/g, '?');
}

// Normaliza um objeto ou array recursivamente
function n(val) {
  if (typeof val === 'string') return normalizeText(val);
  return val;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, contractorData, logData } = await req.json();

    if (type === 'terms') {
      return generateTermsProof(user, logData);
    } else if (type === 'saas_contract') {
      return generateSaasContractProof(user, contractorData);
    } else {
      return Response.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateTermsProof(user, logData) {
  // Se logData for fornecido (download pelo admin), usa os dados do log; caso contrário usa o user autenticado
  const targetName = logData?.user_name || user.full_name || user.email;
  const targetEmail = logData?.user_email || user.email;
  const targetDate = logData?.accepted_at
    ? new Date(logData.accepted_at).toLocaleString('pt-BR')
    : new Date().toLocaleString('pt-BR');
  const termsVersion = logData?.terms_version ? `v${logData.terms_version}` : '';

  const doc = new jsPDF({ compress: false });
  doc.setFont('Helvetica');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const protocol = generateProtocol();
  let y = margin;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(27, 67, 50);
  doc.text('COMPROVANTE DE ACEITE DOS TERMOS DE USO', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('PRUMO HUB | Santa Rute Engenharia LTDA | CNPJ: 62.807.412/0001-95', margin, y);
  y += 5;

  doc.setLineWidth(0.5);
  doc.setDrawColor(27, 67, 50);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Badge
  doc.setFillColor(212, 237, 218);
  doc.setDrawColor(21, 87, 36);
  doc.rect(margin, y, contentWidth, 10, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(21, 87, 36);
  doc.text('Aceite registrado eletronicamente - Valido conforme legislacao brasileira', margin + 4, y + 6.5);
  y += 16;

  // Dados do usuário
  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text('DADOS DO USUARIO', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const infoLines = [
    n(`Nome: ${targetName}`),
    n(`E-mail: ${targetEmail}`),
    n(`Data e Hora do Aceite: ${targetDate}`),
    ...(termsVersion ? [n(`Versao dos Termos: ${termsVersion}`)] : []),
    n(`Protocolo: ${protocol}`),
  ];
  doc.text(infoLines, margin, y);
  y += infoLines.length * 5 + 10;

  // Declaração
  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text('DECLARACAO DE ACEITE', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const declLines = doc.splitTextToSize(
    n('O usuario acima identificado declara que leu e aceitou integralmente os Termos de Uso da plataforma PRUMO HUB. Este documento comprova o aceite eletronico realizado na plataforma em conformidade com a legislacao brasileira. O aceite foi registrado no sistema com timestamp e identificacao unica, constituindo prova valida de consentimento as condicoes de uso da plataforma.'),
    contentWidth
  );
  doc.text(declLines, margin, y);
  y += declLines.length * 5 + 15;

  // Linha de assinatura
  const halfW = contentWidth / 2 - 5;
  doc.setDrawColor(100, 100, 100);
  doc.line(margin, y, margin + halfW, y);
  doc.line(margin + halfW + 10, y, margin + contentWidth, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(n(targetName), margin, y);
  doc.text('PRUMO HUB', margin + halfW + 10, y);
  y += 4;
  doc.text(n(`Aceite em: ${targetDate}`), margin, y);
  doc.text('Aceite Digital', margin + halfW + 10, y);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    n(`Protocolo: ${protocol} | Gerado em ${new Date().toLocaleString('pt-BR')} | hub.prumo.site`),
    margin,
    pageHeight - 8
  );

  const pdfBuffer = doc.output('arraybuffer');
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Comprovante_Termos_${targetEmail.replace(/\W/g,'_')}_${new Date().getTime()}.pdf"`,
    },
  });
}

function generateSaasContractProof(user, contractorData) {
  const doc = new jsPDF({ compress: false });
  doc.setFont('Helvetica');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const now = new Date();
  const protocol = generateProtocol();
  const halfW = contentWidth / 2 - 5;

  // ── PÁGINA 1: Comprovante de Aceite ──────────────────────────────────────
  let y = margin;

  doc.setFontSize(16);
  doc.setTextColor(27, 67, 50);
  doc.text('CONTRATO DE ASSINATURA SAAS', margin, y);
  y += 7;

  doc.setFontSize(11);
  doc.setTextColor(27, 67, 50);
  doc.text('Comprovante de Assinatura Eletronica', margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('PRUMO HUB | Santa Rute Engenharia LTDA | CNPJ: 62.807.412/0001-95', margin, y);
  y += 8;

  doc.setLineWidth(0.5);
  doc.setDrawColor(27, 67, 50);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFillColor(212, 237, 218);
  doc.setDrawColor(21, 87, 36);
  doc.rect(margin, y, contentWidth, 10, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(21, 87, 36);
  doc.text('Documento Assinado Eletronicamente - Valido conforme Lei 14.063/2020', margin + 4, y + 6.5);
  y += 16;

  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text('DADOS DO ACEITE', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const acceptLines = [
    n(`Usuario Cadastrado: ${user.full_name || user.email}`),
    n(`E-mail Cadastrado: ${user.email}`),
    n(`Data e Hora do Aceite: ${now.toLocaleString('pt-BR')}`),
    n(`Protocolo: ${protocol}`),
  ];
  doc.text(acceptLines, margin, y);
  y += acceptLines.length * 5 + 8;

  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text('DADOS DO CONTRATANTE', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const contractorLines = [
    n(`Nome/Razao Social: ${contractorData?.name || '-'}`),
    n(`CPF/CNPJ: ${contractorData?.document || '-'}`),
    n(`Endereco: ${contractorData?.address || '-'}`),
    n(`Telefone: ${contractorData?.phone || '-'}`),
    n(`E-mail: ${contractorData?.email || '-'}`),
  ];
  doc.text(contractorLines, margin, y);
  y += contractorLines.length * 5 + 10;

  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text('DECLARACAO DE ACEITE', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const confirmLines = doc.splitTextToSize(
    'O(a) contratante acima identificado(a) declara que: (1) leu integralmente o Contrato de ' +
    'Assinatura SaaS - PRUMO HUB; (2) compreendeu e aceita todas as clausulas e condicoes; ' +
    '(3) forneceu dados verdadeiros para identificacao; (4) autoriza o processamento de dados ' +
    'conforme a LGPD; (5) realiza o aceite de forma voluntaria, consciente e sem coercao.',
    contentWidth
  );
  doc.text(confirmLines, margin, y);
  y += confirmLines.length * 5 + 15;

  doc.setDrawColor(100, 100, 100);
  doc.line(margin, y, margin + halfW, y);
  doc.line(margin + halfW + 10, y, margin + contentWidth, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(n(`${contractorData?.name || 'Contratante'}`), margin, y);
  doc.text('PRUMO HUB', margin + halfW + 10, y);
  y += 4;
  doc.text(n(`Data: ${now.toLocaleDateString('pt-BR')}`), margin, y);
  doc.text('Aceite Digital', margin + halfW + 10, y);

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(n(`Protocolo: ${protocol} | Gerado em ${now.toLocaleString('pt-BR')} | hub.prumo.site`), margin, pageHeight - 8);

  // ── PÁGINA 2+: Contrato Completo ──────────────────────────────────────────
  doc.addPage();
  y = margin;

  doc.setFontSize(15);
  doc.setTextColor(27, 67, 50);
  doc.text('CONTRATO DE ASSINATURA SAAS - PRUMO HUB', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('PRUMO HUB | Santa Rute Engenharia LTDA | CNPJ: 62.807.412/0001-95', margin, y);
  y += 5;
  doc.setLineWidth(0.5);
  doc.setDrawColor(27, 67, 50);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text('QUALIFICACAO DAS PARTES', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const partsText = doc.splitTextToSize(
    n('CONTRATADA: PRUMO HUB, plataforma digital de gestao voltada ao setor agroambiental, ' +
    'representada pela Santa Rute Engenharia LTDA, CNPJ n.o 62.807.412/0001-95, com sede na ' +
    'Rua Jose Antonio Saraiva n.o 340, bairro Pindorama, Tres Passos/RS - CEP 98600-000.\n\n' +
    `CONTRATANTE: ${contractorData?.name || '-'}, CPF/CNPJ: ${contractorData?.document || '-'}, ` +
    `endereco: ${contractorData?.address || '-'}, telefone: ${contractorData?.phone || '-'}, ` +
    `e-mail: ${contractorData?.email || '-'}.`),
    contentWidth
  );
  doc.text(partsText, margin, y);
  y += partsText.length * 5 + 8;

  const clausulas = [
    ['OBS.: ADEQUACAO AO PLANO CONTRATADO', 'As condicoes comerciais, limites operacionais e funcionalidades aplicaveis ao CONTRATANTE serao aqueles correspondentes ao plano efetivamente contratado no momento do checkout NEXANO.'],
    ['CLAUSULA 1 - OBJETO', 'Concessao de licenca de uso da plataforma PRUMO HUB, na modalidade SaaS, destinada a gestao de propriedades rurais, clientes, processos tecnicos, documentos e atividades relacionadas a consultoria ambiental e rural.'],
    ['CLAUSULA 2 - FUNCIONALIDADES DO PLANO', 'O Plano contratado disponibiliza ao CONTRATANTE funcionalidades conforme descrito na pagina de planos hub.prumo.site/landing. As funcionalidades poderao ser atualizadas, ampliadas ou aprimoradas ao longo do tempo.'],
    ['CLAUSULA 3 - VALOR DA ASSINATURA', 'O valor da assinatura e aquele correspondente ao plano efetivamente contratado no checkout, conforme indicado na plataforma no momento da contratacao.'],
    ['CLAUSULA 4 - PRAZO E FIDELIDADE', 'Prazo minimo de fidelidade de 12 (doze) meses a partir da ativacao. Cancelamento antecipado implica multa de 30% das mensalidades restantes. Apos o prazo minimo, contrato por prazo indeterminado com aviso de 30 dias.'],
    ['CLAUSULA 5 - LIMITES DO PLANO', 'Os limites operacionais (usuarios e propriedades) sao os definidos no plano contratado. Ultrapassados, podera ser necessario upgrade ou contratacao adicional.'],
    ['CLAUSULA 6 - FASE INICIAL DA PLATAFORMA', 'O CONTRATANTE reconhece que a plataforma encontra-se em desenvolvimento continuo. Poderao ocorrer falhas tecnicas temporarias, que nao configuram descumprimento contratual.'],
    ['CLAUSULA 7 - EARLY ADOPTERS', 'O CONTRATANTE podera integrar o programa de usuarios iniciais (Early Adopters), com funcionalidades em fase de testes ou evolucao.'],
    ['CLAUSULA 8 - TREINAMENTO', 'O CONTRATANTE tera direito a periodo inicial de treinamento de 3 meses, com ate 2 reunioes mensais remotas, previamente agendadas.'],
    ['CLAUSULA 9 - RESPONSABILIDADE PELOS DADOS', 'O CONTRATANTE e responsavel pelos dados inseridos. A PRUMO HUB nao se responsabiliza pela veracidade das informacoes ou decisoes tecnicas dos usuarios.'],
    ['CLAUSULA 10 - USO DE DADOS AGREGADOS', 'A plataforma podera usar dados de forma agregada e anonimizada para melhoria do sistema, seguindo as disposicoes da LGPD.'],
    ['CLAUSULA 11 - PROTECAO DA BASE DE CLIENTES', 'A PRUMO HUB compromete-se a nao compartilhar, comercializar ou transferir dados de clientes dos consultores a terceiros.'],
    ['CLAUSULA 12 - EVOLUCAO PARA MARKETPLACE', 'A plataforma podera evoluir para incluir funcionalidades de marketplace, sujeitas a termos adicionais especificos.'],
    ['CLAUSULA 13 - PROPRIEDADE INTELECTUAL', 'Todo o software, design e marca PRUMO HUB sao propriedade intelectual exclusiva da plataforma. E proibido copiar ou explorar comercialmente sem autorizacao.'],
    ['CLAUSULA 14 - DISPONIBILIDADE', 'A plataforma envidara esforcos para manter o sistema disponivel, podendo ocorrer interrupcoes por manutencao ou falhas de infraestrutura.'],
    ['CLAUSULA 15 - LIMITACAO DE RESPONSABILIDADE', 'A plataforma nao se responsabiliza por danos indiretos, perdas financeiras ou decisoes tecnicas dos usuarios.'],
    ['CLAUSULA 16 - INFRAESTRUTURA TECNOLOGICA', 'A plataforma utiliza ferramentas modernas e servicos de terceiros. A PRUMO HUB reserva-se o direito de alterar provedores de infraestrutura.'],
    ['CLAUSULA 17 - RESCISAO', 'A plataforma podera suspender ou encerrar contas em caso de inadimplencia, violacao contratual ou uso indevido.'],
    ['CLAUSULA 18 - LEGISLACAO APLICAVEL', 'Regido pelas leis do Brasil. Foro eleito: comarca de Tres Passos/RS.'],
    ['CLAUSULA 19 - ACEITE DIGITAL', 'O aceite eletronico possui plena validade juridica conforme a legislacao brasileira.'],
    ['CLAUSULA 20 - CONTRATACAO DIGITAL', n(`A identificacao do CONTRATANTE foi realizada pelos dados informados no cadastro. Nome: ${contractorData?.name || '-'} | CPF/CNPJ: ${contractorData?.document || '-'} | E-mail: ${contractorData?.email || '-'} | Aceite registrado em: ${now.toLocaleString('pt-BR')}`)],
  ];

  for (const [titulo, texto] of clausulas) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(n(`Contrato SaaS PRUMO HUB | ${contractorData?.name || '-'} | Protocolo: ${protocol}`), margin, 8);
    }

    doc.setFontSize(9);
    doc.setTextColor(27, 67, 50);
    doc.setFont(undefined, 'bold');
    doc.text(titulo, margin, y);
    y += 5;

    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(texto, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 5;
  }

  if (y > pageHeight - 60) {
    doc.addPage();
    y = margin;
  }
  y += 5;
  doc.setLineWidth(0.3);
  doc.setDrawColor(100, 100, 100);
  doc.line(margin, y, margin + halfW, y);
  doc.line(margin + halfW + 10, y, margin + contentWidth, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.setFont(undefined, 'normal');
  doc.text(n(`${contractorData?.name || 'Contratante'}`), margin, y);
  doc.text('Santa Rute Engenharia LTDA', margin + halfW + 10, y);
  y += 4;
  doc.text(n(`CPF/CNPJ: ${contractorData?.document || '-'}`), margin, y);
  doc.text('CNPJ: 62.807.412/0001-95', margin + halfW + 10, y);
  y += 4;
  doc.text(n(`Data: ${now.toLocaleDateString('pt-BR')}`), margin, y);
  doc.text(n(`Data: ${now.toLocaleDateString('pt-BR')}`), margin + halfW + 10, y);

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(n(`Protocolo: ${protocol} | Valido conforme Lei 14.063/2020 | hub.prumo.site`), margin, pageHeight - 8);

  const pdfBuffer = doc.output('arraybuffer');
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Contrato_SaaS_PRUMO_${(contractorData?.document || 'user').replace(/\D/g,'')}_${now.getTime()}.pdf"`,
    },
  });
}

function generateProtocol() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `PRUMO-${random}-${timestamp.slice(-8)}`;
}