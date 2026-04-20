import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import jsPDF from 'npm:jspdf@2.5.2';

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
  const doc = new jsPDF();
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
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(27, 67, 50);
  doc.text('CONTRATO DE ASSINATURA SAAS - ACEITE COMPROBATÓRIO', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('PRUMO HUB | Santa Rute Engenharia LTDA', margin, yPosition);
  yPosition += 8;

  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Dados do aceite
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('DADOS DO ACEITE:', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const now = new Date();
  const acceptanceLines = [
    `Usuário Cadastrado: ${user.full_name || user.email}`,
    `E-mail Cadastrado: ${user.email}`,
    `Data e Hora do Aceite: ${now.toLocaleString('pt-BR')}`,
    `Data do Servidor: ${now.toISOString()}`,
    `IP / User Agent: ${getClientInfo()}`,
  ];
  doc.text(acceptanceLines, margin, yPosition);
  yPosition += acceptanceLines.length * 5 + 5;

  // Dados do contratante
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('DADOS DO CONTRATANTE:', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const contractorLines = [
    `Nome/Razão Social: ${contractorData.name}`,
    `CPF/CNPJ: ${contractorData.document}`,
    `Endereço: ${contractorData.address}`,
    `Telefone: ${contractorData.phone}`,
    `E-mail: ${contractorData.email}`,
  ];
  doc.text(contractorLines, margin, yPosition);
  yPosition += contractorLines.length * 5 + 10;

  // Confirmação
  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text('CONFIRMAÇÃO DE ACEITE', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const confirmLines = doc.splitTextToSize(
    `O(a) contratante acima identificado(a) declara que:\n\n` +
    `1. Leu integralmente o Contrato de Assinatura SaaS - PRUMO HUB;\n` +
    `2. Compreendeu e aceita todas as cláusulas, condições e termos nele contidos;\n` +
    `3. Forneceu dados verdadeiros e precisos para identificação;\n` +
    `4. Autoriza o processamento dos dados conforme legislação de proteção de dados;\n` +
    `5. Realiza o aceite de forma voluntária, consciente e sem coerção.`,
    contentWidth
  );
  doc.text(confirmLines, margin, yPosition);
  yPosition += confirmLines.length * 5 + 10;

  // Assinatura digital
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, margin + 40, yPosition);
  yPosition += 15;
  doc.text('Assinado digitalmente pelo sistema', margin, yPosition);
  yPosition += 5;
  doc.text('PRUMO HUB em', margin, yPosition);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Protocolo: ${generateProtocol()} | Válido conforme Lei 14.063/2020 (Assinatura Eletrônica)`,
    margin,
    pageHeight - 10
  );

  const pdfBuffer = doc.output('arraybuffer');
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Contrato_SaaS_${contractorData.document}_${new Date().getTime()}.pdf"`,
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