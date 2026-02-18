import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { interaction, clientName, propertyName } = await req.json();

    if (!interaction) {
      return Response.json({ error: 'Missing interaction data' }, { status: 400 });
    }

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Prepare event data
    const eventTitle = `${interaction.type} - ${clientName || 'Cliente'}`;
    const eventDescription = `${propertyName ? `Propriedade: ${propertyName}\n` : ''}Tipo: ${interaction.type}\n${interaction.description || ''}${interaction.next_action ? `\n\nPróxima ação: ${interaction.next_action}` : ''}`;

    const eventData = {
      summary: eventTitle,
      description: eventDescription,
      start: {
        dateTime: new Date(interaction.date).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: new Date(new Date(interaction.date).getTime() + 3600000).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
    };

    // Add next action date as a reminder if available
    if (interaction.next_action_date) {
      eventData.reminders = {
        useDefault: false,
        overrides: [
          {
            method: 'email',
            minutes: 24 * 60, // 1 day before
          },
        ],
      };
    }

    // Create event in Google Calendar
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const error = await response.json();
      return Response.json(
        { error: 'Failed to create calendar event', details: error },
        { status: response.status }
      );
    }

    const event = await response.json();
    return Response.json({
      success: true,
      message: 'Evento sincronizado com sucesso no Google Calendar',
      eventId: event.id,
      eventLink: event.htmlLink,
    });
  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});