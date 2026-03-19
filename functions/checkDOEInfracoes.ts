import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function normalizeDoc(doc) {
    return (doc || '').replace(/\D/g, '');
}

function searchDocInText(text, doc) {
    const clean = normalizeDoc(doc);
    if (!clean || clean.length < 11) return false;
    const lower = text.toLowerCase();
    if (lower.includes(clean)) return true;
    if (clean.length === 11) {
        const formatted = `${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6,9)}-${clean.slice(9)}`;
        if (lower.includes(formatted)) return true;
    }
    if (clean.length === 14) {
        const formatted = `${clean.slice(0,2)}.${clean.slice(2,5)}.${clean.slice(5,8)}/${clean.slice(8,12)}-${clean.slice(12)}`;
        if (lower.includes(formatted)) return true;
    }
    return false;
}

function extractXmlTag(xml, tag) {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        // Fetch RSS feed do DOE-RS
        const rssUrl = 'https://secweb.procergs.com.br/doe/materias/feed/rss.xml';
        const rssResponse = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!rssResponse.ok) {
            return Response.json({ error: 'Falha ao acessar o DOE-RS', status: rssResponse.status }, { status: 500 });
        }
        const rssText = await rssResponse.text();

        // Extrai itens do RSS
        const itemMatches = [...rssText.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

        // Filtra itens da FEPAM sobre autos de infração
        const keywords = ['auto de infração', 'notificação inicial', 'edital de notificação', 'auto de infraçao'];
        const fepamItems = itemMatches
            .map(m => m[1])
            .filter(item => {
                const lower = item.toLowerCase();
                const hasFepam = lower.includes('fepam');
                const hasInfracao = keywords.some(kw => lower.includes(kw));
                return hasFepam && hasInfracao;
            })
            .map(item => ({
                title: extractXmlTag(item, 'title'),
                link: extractXmlTag(item, 'guid') || extractXmlTag(item, 'link'),
                content: item
            }));

        // Busca clientes do consultor
        const isConsultor = user.user_type === 'consultor' || user.user_type === 'equipe';
        let clients = [];
        if (isConsultor) {
            clients = await base44.entities.ClientCRM.filter({ consultor_email: user.email });
        } else {
            // Produtor: busca propriedades próprias
            const props = await base44.entities.Property.filter({ owner_email: user.email });
            // Simula clientes a partir das propriedades (usa owner como referência)
            clients = props.map(p => ({
                client_email: p.owner_email,
                client_name: p.owner_names || p.property_name,
                cpf: null,
                cnpj: null,
                property_id: p.id,
                _owner_names: p.owner_names
            }));
        }

        const results = [];

        for (const item of fepamItems) {
            const fullText = item.content + ' ' + item.title;

            for (const client of clients) {
                const cpfMatch = client.cpf && searchDocInText(fullText, client.cpf);
                const cnpjMatch = client.cnpj && searchDocInText(fullText, client.cnpj);

                if (cpfMatch || cnpjMatch) {
                    const matchType = cpfMatch ? 'CPF' : 'CNPJ';
                    const matchDoc = cpfMatch ? client.cpf : client.cnpj;

                    // Verifica duplicata
                    const doeRef = `DOE-RS-FEPAM: ${item.title.substring(0, 80)}`;
                    const existing = await base44.entities.Process.filter({
                        client_email: client.client_email || user.email,
                        subject: doeRef
                    });

                    if (existing.length === 0) {
                        const processData = {
                            client_email: client.client_email || user.email,
                            property_id: client.property_id || '',
                            process_type: 'Administrativo',
                            process_number: `DOE-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-6)}`,
                            subject: doeRef,
                            status: 'Em Andamento',
                            filing_date: new Date().toISOString().split('T')[0],
                            notes: `⚠️ Detectado automaticamente pelo Monitoramento DOE-RS FEPAM\n\nCliente: ${client.client_name || 'N/A'}\nDocumento (${matchType}): ${matchDoc}\nLink DOE: ${item.link}\n\nTítulo completo: ${item.title}`
                        };

                        await base44.entities.Process.create(processData);

                        // Envia email de alerta
                        await base44.integrations.Core.SendEmail({
                            to: user.email,
                            subject: `⚠️ Alerta DOE-RS: Novo Auto de Infração FEPAM detectado`,
                            body: `
                                <h2>Alerta de Monitoramento DOE-RS</h2>
                                <p>Foi detectado um possível Auto de Infração da FEPAM para o cliente <strong>${client.client_name || 'N/A'}</strong>.</p>
                                <p><strong>Documento identificado (${matchType}):</strong> ${matchDoc}</p>
                                <p><strong>Publicação:</strong> ${item.title}</p>
                                <p><strong>Link DOE-RS:</strong> <a href="${item.link}">${item.link}</a></p>
                                <p>Um novo processo foi criado automaticamente na plataforma PRUMO Hub para acompanhamento.</p>
                                <hr>
                                <p><small>Monitoramento automático semanal do Diário Oficial do Estado do RS - FEPAM</small></p>
                            `
                        });

                        results.push({ client: client.client_name, matchType, title: item.title });
                    }
                }
            }
        }

        return Response.json({
            success: true,
            scanned_items: fepamItems.length,
            clients_checked: clients.length,
            matches_found: results.length,
            new_processes: results,
            scanned_at: new Date().toISOString()
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});