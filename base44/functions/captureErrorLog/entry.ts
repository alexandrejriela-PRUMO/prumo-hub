import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const errorData = {
      error_message: body?.error_message || 'Unknown error',
      error_stack: body?.error_stack || '',
      error_type: body?.error_type || 'unknown',
      page_url: body?.page_url || '',
      user_email: user?.email || '',
      user_agent: body?.user_agent || '',
      severity: body?.severity || 'medium',
      context_data: body?.context_data || {},
      last_occurrence: new Date().toISOString()
    };

    // Check for similar error
    const existing = await base44.entities.ErrorLog.filter({
      error_message: errorData.error_message,
      resolved: false
    }, '-last_occurrence', 1);

    if (existing && existing.length > 0) {
      await base44.entities.ErrorLog.update(existing[0].id, {
        frequency: (existing[0]?.frequency || 1) + 1,
        last_occurrence: new Date().toISOString()
      });
      return Response.json({ status: 'updated', id: existing[0].id });
    } else {
      const newLog = await base44.entities.ErrorLog.create(errorData);
      return Response.json({ status: 'created', id: newLog?.id });
    }
  } catch (error) {
    console.error('Error in captureErrorLog:', error);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});