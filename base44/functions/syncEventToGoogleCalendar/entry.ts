import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { interaction, propertyId, clientEmail } = await req.json();

        if (!interaction || !interaction.date || !interaction.title) {
            return Response.json({ error: 'Missing interaction data' }, { status: 400 });
        }

        // Get access token for Google Calendar
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

        // Format event for Google Calendar
        const eventStart = new Date(interaction.date);
        const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour duration

        const event = {
            summary: `${interaction.type} - ${interaction.title}`,
            description: interaction.description || '',
            start: {
                dateTime: eventStart.toISOString(),
                timeZone: 'America/Sao_Paulo'
            },
            end: {
                dateTime: eventEnd.toISOString(),
                timeZone: 'America/Sao_Paulo'
            },
            attendees: clientEmail ? [{ email: clientEmail }] : []
        };

        // Create event in Google Calendar
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            const error = await response.json();
            return Response.json({ error: 'Failed to sync event to Google Calendar', details: error }, { status: 500 });
        }

        const result = await response.json();
        return Response.json({ success: true, eventId: result.id, eventLink: result.htmlLink });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});