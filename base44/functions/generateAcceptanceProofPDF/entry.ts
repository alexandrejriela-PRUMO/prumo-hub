import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, contractorData } = await req.json();

    if (type === 'terms') {
      return generateTermsProof(user);
    } else if (type === 'saas_contract') {
      return generateSaasContractProof(user, contractorData);
    } else {
      return Response.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateTermsProof(user) {
  const doc = new jsPDF({ compress: false });
  doc.setFont('Helvetica');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Header
  doc.setFontSize(18);
  doc.setTextColor(27, 67, 50); // Cor primária
  doc.text('COMPROVANTE DE ACEITE', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('Termos de Uso - PRUMO HUB', margin, yPosition);
  yPosition += 12;

  // Info box
  doc.setDrawColor(200, 220, 200);
  doc.setFillColor(245, 255, 245);
  doc.rect(margin, yPosition, contentWidth, 25, 'F');
  doc.setFontSize(9);
  doc.setTextColor(30, 100, 60);
  doc.text(`Usuário: ${user.full_name || user.email}`, margin + 3, yPosition + 6);
  doc.text(`E-mail: ${user.email}`, margin + 3, yPosition + 12);
  doc.text(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`, margin + 3, yPosition + 18);
  yPosition += 30;

  // Content
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('CONFIRMAÇÃO DE ACEITE', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const contentLines = doc.splitTextToSize(
    `O usuário acima identificado declara que leu e aceitou integralmente os Termos de Uso da plataforma PRUMO HUB. Este documento comprova o aceite eletrônico realizado na plataforma em conformidade com a legislação brasileira.\n\nO aceite foi registrado no sistema com timestamp e identificação única, constituindo prova válida de consentimento às condições de uso da plataforma.`,
    contentWidth
  );
  doc.text(contentLines, margin, yPosition);
  yPosition += contentLines.length * 5 + 10;

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')} | ID: ${user.id} | Protocolo: ${generateProtocol()}`,
    margin,
    pageHeight - 10
  );

  const pdfBuffer = doc.output('arraybuffer');
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Comprovante_Termos_${user.email}_${new Date().getTime()}.pdf"`,
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

  // ── PÁGINA 1: Comprovante de Aceite ──────────────────────────────────────
  let y = margin;

  doc.setFontSize(16);
  doc.setTextColor(27, 67, 50);
  doc.text('CONTRATO DE ASSINATURA SAAS', margin, y);
  y += 7;

  doc.setFontSize(11);
  doc.setTextColor(27, 67, 50);
  doc.text('Comprovante de Assinatura Eletrônica', margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('PRUMO HUB | Santa Rute Engenharia LTDA | CNPJ: 62.807.412/0001-95', margin, y);
  y += 8;

  doc.setLineWidth(0.5);
  doc.setDrawColor(27, 67, 50);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Badge de assinatura
  doc.setFillColor(212, 237, 218);
  doc.setDrawColor(21, 87, 36);
  doc.rect(margin, y, contentWidth, 10, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(21, 87, 36);
  doc.text('✓  Documento Assinado Eletronicamente — Válido conforme Lei 14.063/2020', margin + 4, y + 6.5);
  y += 16;

  // Dados do aceite
  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text('DADOS DO ACEITE', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const acceptLines = [
    `Usuário Cadastrado: ${user.full_name || user.email}`,
    `E-mail Cadastrado: ${user.email}`,
    `Data e Hora do Aceite: ${now.toLocaleString('pt-BR')}`,
    `Protocolo: ${protocol}`,
  ];
  doc.text(acceptLines, margin, y);
  y += acceptLines.length * 5 + 8;

  // Dados do contratante
  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text('DADOS DO CONTRATANTE', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const contractorLines = [
    `Nome/Razão Social: ${contractorData?.name || '—'}`,
    `CPF/CNPJ: ${contractorData?.document || '—'}`,
    `Endereço: ${contractorData?.address || '—'}`,
    `Telefone: ${contractorData?.phone || '—'}`,
    `E-mail: ${contractorData?.email || '—'}`,
  ];
  doc.text(contractorLines, margin, y);
  y += contractorLines.length * 5 + 10;

  // Confirmação de aceite
  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text('DECLARAÇÃO DE ACEITE', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const confirmLines = doc.splitTextToSize(
    'O(a) contratante acima identificado(a) declara que: (1) leu integralmente o Contrato de ' +
    'Assinatura SaaS - PRUMO HUB; (2) compreendeu e aceita todas as cláusulas e condições; ' +
    '(3) forneceu dados verdadeiros para identificação; (4) autoriza o processamento de dados ' +
    'conforme a LGPD; (5) realiza o aceite de forma voluntária, consciente e sem coerção.',
    contentWidth
  );
  doc.text(confirmLines, margin, y);
  y += confirmLines.length * 5 + 15;

  // Linhas de assinatura
  const halfW = contentWidth / 2 - 5;
  doc.setDrawColor(100, 100, 100);
  doc.line(margin, y, margin + halfW, y);
  doc.line(margin + halfW + 10, y, margin + contentWidth, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`${contractorData?.name || 'Contratante'}`, margin, y);
  doc.text('PRUMO HUB', margin + halfW + 10, y);
  y += 4;
  doc.text(`Data: ${now.toLocaleDateString('pt-BR')}`, margin, y);
  doc.text('Aceite Digital', margin + halfW + 10, y);

  // Footer pág 1
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Protocolo: ${protocol} | Gerado em ${now.toLocaleString('pt-BR')} | hub.prumo.site`, margin, pageHeight - 8);

  // ── PÁGINA 2+: Contrato Completo com Dados do Contratante ─────────────────
  doc.addPage();
  y = margin;

  doc.setFontSize(15);
  doc.setTextColor(27, 67, 50);
  doc.text('CONTRATO DE ASSINATURA SAAS — PRUMO HUB', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('PRUMO HUB | Santa Rute Engenharia LTDA | CNPJ: 62.807.412/0001-95', margin, y);
  y += 5;
  doc.setLineWidth(0.5);
  doc.setDrawColor(27, 67, 50);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Qualificação das partes
  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text('QUALIFICAÇÃO DAS PARTES', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const partsText = doc.splitTextToSize(
    'CONTRATADA: PRUMO HUB, plataforma digital de gestão voltada ao setor agroambiental, ' +
    'representada pela Santa Rute Engenharia LTDA, CNPJ n.º 62.807.412/0001-95, com sede na ' +
    'Rua José Antônio Saraiva n.º 340, bairro Pindorama, Três Passos/RS – CEP 98600-000.\n\n' +
    `CONTRATANTE: ${contractorData?.name || '—'}, CPF/CNPJ: ${contractorData?.document || '—'}, ` +
    `endereço: ${contractorData?.address || '—'}, telefone: ${contractorData?.phone || '—'}, ` +
    `e-mail: ${contractorData?.email || '—'}.`,
    contentWidth
  );
  doc.text(partsText, margin, y);
  y += partsText.length * 5 + 8;

  // Conteúdo das cláusulas (texto puro extraído do HTML)
  const clausulas = [
    ['OBS.: ADEQUAÇÃO AO PLANO CONTRATADO', 'As condições comerciais, limites operacionais e funcionalidades aplicáveis ao CONTRATANTE serão aqueles correspondentes ao plano efetivamente contratado no momento do checkout NEXANO.'],
    ['CLÁUSULA 1 — OBJETO', 'Concessão de licença de uso da plataforma PRUMO HUB, na modalidade SaaS, destinada à gestão de propriedades rurais, clientes, processos técnicos, documentos e atividades relacionadas à consultoria ambiental e rural.'],
    ['CLÁUSULA 2 — FUNCIONALIDADES DO PLANO', 'O Plano contratado disponibiliza ao CONTRATANTE funcionalidades conforme descrito na página de planos hub.prumo.site/landing. As funcionalidades poderão ser atualizadas, ampliadas ou aprimoradas ao longo do tempo.'],
    ['CLÁUSULA 3 — VALOR DA ASSINATURA', 'O valor da assinatura é aquele correspondente ao plano efetivamente contratado no checkout, conforme indicado na plataforma no momento da contratação.'],
    ['CLÁUSULA 4 — PRAZO E FIDELIDADE', 'Prazo mínimo de fidelidade de 12 (doze) meses a partir da ativação. Cancelamento antecipado implica multa de 30% das mensalidades restantes. Após o prazo mínimo, contrato por prazo indeterminado com aviso de 30 dias.'],
    ['CLÁUSULA 5 — LIMITES DO PLANO', 'Os limites operacionais (usuários e propriedades) são os definidos no plano contratado. Ultrapassados, poderá ser necessário upgrade ou contratação adicional.'],
    ['CLÁUSULA 6 — FASE INICIAL DA PLATAFORMA', 'O CONTRATANTE reconhece que a plataforma encontra-se em desenvolvimento contínuo. Poderão ocorrer falhas técnicas temporárias, que não configuram descumprimento contratual.'],
    ['CLÁUSULA 7 — EARLY ADOPTERS', 'O CONTRATANTE poderá integrar o programa de usuários iniciais (Early Adopters), com funcionalidades em fase de testes ou evolução.'],
    ['CLÁUSULA 8 — TREINAMENTO', 'O CONTRATANTE terá direito a período inicial de treinamento de 3 meses, com até 2 reuniões mensais remotas, previamente agendadas.'],
    ['CLÁUSULA 9 — RESPONSABILIDADE PELOS DADOS', 'O CONTRATANTE é responsável pelos dados inseridos. A PRUMO HUB não se responsabiliza pela veracidade das informações ou decisões técnicas dos usuários.'],
    ['CLÁUSULA 10 — USO DE DADOS AGREGADOS', 'A plataforma poderá usar dados de forma agregada e anonimizada para melhoria do sistema, seguindo as disposições da LGPD.'],
    ['CLÁUSULA 11 — PROTEÇÃO DA BASE DE CLIENTES', 'A PRUMO HUB compromete-se a não compartilhar, comercializar ou transferir dados de clientes dos consultores a terceiros.'],
    ['CLÁUSULA 12 — EVOLUÇÃO PARA MARKETPLACE', 'A plataforma poderá evoluir para incluir funcionalidades de marketplace, sujeitas a termos adicionais específicos.'],
    ['CLÁUSULA 13 — PROPRIEDADE INTELECTUAL', 'Todo o software, design e marca PRUMO HUB são propriedade intelectual exclusiva da plataforma. É proibido copiar ou explorar comercialmente sem autorização.'],
    ['CLÁUSULA 14 — DISPONIBILIDADE', 'A plataforma envidará esforços para manter o sistema disponível, podendo ocorrer interrupções por manutenção ou falhas de infraestrutura.'],
    ['CLÁUSULA 15 — LIMITAÇÃO DE RESPONSABILIDADE', 'A plataforma não se responsabiliza por danos indiretos, perdas financeiras ou decisões técnicas dos usuários.'],
    ['CLÁUSULA 16 — INFRAESTRUTURA TECNOLÓGICA', 'A plataforma utiliza ferramentas modernas e serviços de terceiros. A PRUMO HUB reserva-se o direito de alterar provedores de infraestrutura.'],
    ['CLÁUSULA 17 — RESCISÃO', 'A plataforma poderá suspender ou encerrar contas em caso de inadimplência, violação contratual ou uso indevido.'],
    ['CLÁUSULA 18 — LEGISLAÇÃO APLICÁVEL', 'Regido pelas leis do Brasil. Foro eleito: comarca de Três Passos/RS.'],
    ['CLÁUSULA 19 — ACEITE DIGITAL', 'O aceite eletrônico possui plena validade jurídica conforme a legislação brasileira.'],
    ['CLÁUSULA 20 — CONTRATAÇÃO DIGITAL', `A identificação do CONTRATANTE foi realizada pelos dados informados no cadastro. Nome: ${contractorData?.name || '—'} | CPF/CNPJ: ${contractorData?.document || '—'} | E-mail: ${contractorData?.email || '—'} | Aceite registrado em: ${now.toLocaleString('pt-BR')}`],
  ];

  for (const [titulo, texto] of clausulas) {
    // Verificar se precisa de nova página
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Contrato SaaS PRUMO HUB | ${contractorData?.name || '—'} | Protocolo: ${protocol}`, margin, 8);
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

  // Bloco de assinatura final
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
  doc.text(`${contractorData?.name || 'Contratante'}`, margin, y);
  doc.text('Santa Rute Engenharia LTDA', margin + halfW + 10, y);
  y += 4;
  doc.text(`CPF/CNPJ: ${contractorData?.document || '—'}`, margin, y);
  doc.text('CNPJ: 62.807.412/0001-95', margin + halfW + 10, y);
  y += 4;
  doc.text(`Data: ${now.toLocaleDateString('pt-BR')}`, margin, y);
  doc.text(`Data: ${now.toLocaleDateString('pt-BR')}`, margin + halfW + 10, y);

  // Footer última página
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Protocolo: ${protocol} | Válido conforme Lei 14.063/2020 | hub.prumo.site`, margin, pageHeight - 8);

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

function getClientInfo() {
  return 'Sistema Automatizado';
}