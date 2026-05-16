import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmt = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d) => { try { return d ? format(parseISO(d), 'dd/MM/yyyy') : '—'; } catch { return d || '—'; } };

export function exportFinancialPDF({ sorted, totalReceitas, totalDespesas, resultado, filterMonth, userName }) {
  const periodLabel = filterMonth
    ? format(parseISO(filterMonth + '-01'), 'MMMM/yyyy', { locale: ptBR })
    : 'Todos os períodos';

  const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  // Group by type for summary
  const receitas = sorted.filter(t => t.type === 'receita');
  const despesas = sorted.filter(t => t.type === 'despesa');
  const receitasPagas = receitas.filter(t => t.status === 'Pago');
  const receitasPendentes = receitas.filter(t => t.status === 'Pendente');

  const rows = sorted.map((t, i) => {
    const isReceita = t.type === 'receita';
    const valorFormatado = `${isReceita ? '+' : '-'} ${fmt(t.amount)}`;
    const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
    const valorColor = isReceita ? '#059669' : '#dc2626';
    return `
      <tr style="background:${bg};">
        <td style="padding:7px 10px; font-size:12px; color:${valorColor}; font-weight:600;">${isReceita ? '▲ Receita' : '▼ Despesa'}</td>
        <td style="padding:7px 10px; font-size:11px; color:#6b7280;">${t.source || '—'}</td>
        <td style="padding:7px 10px; font-size:12px; color:#111827; font-weight:500; max-width:180px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${t.description || '—'}</td>
        <td style="padding:7px 10px; font-size:11px; color:#374151;">${t.client || '—'}</td>
        <td style="padding:7px 10px; font-size:11px; color:#374151;">${t.accountLabel || '—'}</td>
        <td style="padding:7px 10px; font-size:11px; color:#374151; white-space:nowrap;">${fmtDate(t.date)}</td>
        <td style="padding:7px 10px; font-size:12px; text-align:right; font-weight:700; color:${valorColor}; white-space:nowrap;">${valorFormatado}</td>
        <td style="padding:7px 10px; font-size:11px; text-align:center;">
          <span style="padding:2px 8px; border-radius:20px; font-size:10px; font-weight:600;
            background:${t.status === 'Pago' ? '#d1fae5' : t.status === 'Pendente' ? '#fef3c7' : t.status === 'Vencido' ? '#fee2e2' : '#f3f4f6'};
            color:${t.status === 'Pago' ? '#065f46' : t.status === 'Pendente' ? '#92400e' : t.status === 'Vencido' ? '#991b1b' : '#374151'};">
            ${t.status || '—'}
          </span>
        </td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Relatório Financeiro — ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #111827; }
    .page { max-width: 960px; margin: 0 auto; background: #fff; }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .page { max-width: 100%; box-shadow: none; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%); color:#fff; padding: 32px 40px 24px;">
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <div style="font-size:10px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#6ee7b7; margin-bottom:8px;">PRUMO HUB</div>
        <h1 style="font-size:26px; font-weight:800; letter-spacing:-0.5px;">Relatório Financeiro</h1>
        <p style="font-size:14px; color:#a7f3d0; margin-top:4px; text-transform:capitalize;">${periodLabel}</p>
      </div>
      <div style="text-align:right; font-size:11px; color:#a7f3d0; line-height:1.7;">
        <div>Gerado em: ${now}</div>
        ${userName ? `<div>Consultor: ${userName}</div>` : ''}
        <div>${sorted.length} transaç${sorted.length !== 1 ? 'ões' : 'ão'} listada${sorted.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
  </div>

  <!-- KPI CARDS -->
  <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px; padding:24px 40px; background:#f0fdf4;">
    <div style="background:#fff; border-radius:12px; border:1px solid #d1fae5; padding:16px 20px;">
      <div style="font-size:10px; color:#6b7280; text-transform:uppercase; font-weight:600; letter-spacing:1px; margin-bottom:6px;">Receitas Confirmadas</div>
      <div style="font-size:22px; font-weight:800; color:#059669;">${fmt(totalReceitas)}</div>
      <div style="font-size:10px; color:#10b981; margin-top:4px;">${receitasPagas.length} transaç${receitasPagas.length !== 1 ? 'ões' : 'ão'} pagas</div>
    </div>
    <div style="background:#fff; border-radius:12px; border:1px solid #fee2e2; padding:16px 20px;">
      <div style="font-size:10px; color:#6b7280; text-transform:uppercase; font-weight:600; letter-spacing:1px; margin-bottom:6px;">Total de Despesas</div>
      <div style="font-size:22px; font-weight:800; color:#dc2626;">${fmt(totalDespesas)}</div>
      <div style="font-size:10px; color:#ef4444; margin-top:4px;">${despesas.length} lançamento${despesas.length !== 1 ? 's' : ''}</div>
    </div>
    <div style="background:#fff; border-radius:12px; border:1px solid ${resultado >= 0 ? '#bfdbfe' : '#fde68a'}; padding:16px 20px;">
      <div style="font-size:10px; color:#6b7280; text-transform:uppercase; font-weight:600; letter-spacing:1px; margin-bottom:6px;">Resultado Líquido</div>
      <div style="font-size:22px; font-weight:800; color:${resultado >= 0 ? '#1d4ed8' : '#d97706'};">${fmt(resultado)}</div>
      <div style="font-size:10px; color:#6b7280; margin-top:4px;">${resultado >= 0 ? '✓ Positivo no período' : '⚠ Negativo no período'}</div>
    </div>
  </div>

  <!-- SECONDARY SUMMARY -->
  <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px; padding:0 40px 24px; background:#f0fdf4;">
    <div style="background:#fff; border-radius:10px; border:1px solid #e5e7eb; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:11px; color:#6b7280;">Receitas Pendentes</span>
      <span style="font-size:13px; font-weight:700; color:#d97706;">${fmt(receitasPendentes.reduce((s,t)=>s+t.amount,0))}</span>
    </div>
    <div style="background:#fff; border-radius:10px; border:1px solid #e5e7eb; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:11px; color:#6b7280;">Total de Receitas (bruto)</span>
      <span style="font-size:13px; font-weight:700; color:#059669;">${fmt(receitas.reduce((s,t)=>s+t.amount,0))}</span>
    </div>
    <div style="background:#fff; border-radius:10px; border:1px solid #e5e7eb; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:11px; color:#6b7280;">Qtd. Transações</span>
      <span style="font-size:13px; font-weight:700; color:#374151;">${sorted.length}</span>
    </div>
  </div>

  <!-- TABLE -->
  <div style="padding:0 40px 40px;">
    <h2 style="font-size:14px; font-weight:700; color:#064e3b; margin-bottom:12px; padding-bottom:8px; border-bottom:2px solid #d1fae5; letter-spacing:0.5px; text-transform:uppercase;">
      Detalhamento das Transações
    </h2>
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr style="background:#064e3b; color:#fff;">
          <th style="padding:10px; text-align:left; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">Tipo</th>
          <th style="padding:10px; text-align:left; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">Origem</th>
          <th style="padding:10px; text-align:left; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">Descrição</th>
          <th style="padding:10px; text-align:left; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">Cliente</th>
          <th style="padding:10px; text-align:left; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">Conta</th>
          <th style="padding:10px; text-align:left; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">Data</th>
          <th style="padding:10px; text-align:right; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">Valor</th>
          <th style="padding:10px; text-align:center; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#064e3b; color:#fff;">
          <td colspan="6" style="padding:12px 10px; font-size:13px; font-weight:700;">TOTAL (${sorted.length} itens)</td>
          <td style="padding:12px 10px; text-align:right;">
            <div style="font-size:11px; color:#6ee7b7; font-weight:600; line-height:1.8;">+ ${fmt(totalReceitas)}</div>
            <div style="font-size:11px; color:#fca5a5; font-weight:600; line-height:1.8;">- ${fmt(totalDespesas)}</div>
            <div style="font-size:14px; color:${resultado >= 0 ? '#bfdbfe' : '#fde68a'}; font-weight:800; border-top:1px solid rgba(255,255,255,0.3); padding-top:4px; margin-top:4px;">${fmt(resultado)}</div>
          </td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- FOOTER -->
  <div style="background:#f9fafb; border-top:1px solid #e5e7eb; padding:16px 40px; display:flex; justify-content:space-between; align-items:center;">
    <div style="font-size:10px; color:#9ca3af;">PRUMO Hub — Relatório gerado automaticamente em ${now}</div>
    <div style="font-size:10px; color:#9ca3af;">Documento confidencial — uso interno</div>
  </div>

  <!-- PRINT BUTTON -->
  <div class="no-print" style="padding:20px 40px; text-align:center;">
    <button onclick="window.print()" style="background:#064e3b; color:#fff; border:none; border-radius:8px; padding:12px 32px; font-size:14px; font-weight:600; cursor:pointer; letter-spacing:0.5px;">
      🖨️ Imprimir / Salvar como PDF
    </button>
  </div>

</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}