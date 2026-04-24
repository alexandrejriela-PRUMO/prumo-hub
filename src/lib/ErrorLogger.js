import { base44 } from '@/api/base44Client';

class ErrorLogger {
  static async captureError(error, context = {}) {
    try {
      const errorData = {
        error_message: error?.message || 'Unknown error',
        error_stack: error?.stack || '',
        error_type: this.classifyError(error),
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        user_email: context.userEmail || '',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        severity: context.severity || this.determineSeverity(error),
        context_data: {
          component: context.component || '',
          action: context.action || '',
          timestamp: new Date().toISOString(),
          ...context
        }
      };

      // Log to console in development
      if (import.meta.env.DEV) {
        console.error('🚨 Error Logged:', errorData);
      }

      // Check if similar error exists
      const existing = await this.findSimilarError(errorData.error_message);
      
      if (existing && existing.length > 0) {
        // Update frequency
        await base44.entities.ErrorLog.update(existing[0].id, {
          frequency: (existing[0].frequency || 1) + 1,
          last_occurrence: new Date().toISOString()
        });
      } else {
        // Create new error log
        await base44.entities.ErrorLog.create(errorData);
      }
    } catch (err) {
      console.error('Failed to log error:', err);
    }
  }

  static classifyError(error) {
    const message = error?.message || '';
    const stack = error?.stack || '';

    if (message.includes('network') || message.includes('fetch') || message.includes('Network')) {
      return 'network';
    }
    if (message.includes('validation') || message.includes('required')) {
      return 'validation';
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('401')) {
      return 'auth';
    }
    if (message.includes('database') || message.includes('query')) {
      return 'database';
    }
    if (stack.includes('TypeError') || stack.includes('ReferenceError')) {
      return 'runtime';
    }
    return 'unknown';
  }

  static determineSeverity(error) {
    const message = error?.message || '';
    
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }
    if (message.includes('error') && message.length > 100) {
      return 'high';
    }
    if (message.includes('warning')) {
      return 'low';
    }
    return 'medium';
  }

  static async findSimilarError(errorMessage) {
    try {
      return await base44.entities.ErrorLog.filter({
        error_message: errorMessage,
        resolved: false
      }, '-last_occurrence', 1);
    } catch {
      return [];
    }
  }

  static async resolveError(errorId, notes = '') {
    try {
      await base44.entities.ErrorLog.update(errorId, {
        resolved: true,
        resolution_notes: notes,
        last_occurrence: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to resolve error:', err);
    }
  }

  static async getErrorStats() {
    try {
      const all = await base44.entities.ErrorLog.list();
      const unresolved = all.filter(e => !e.resolved);
      const critical = all.filter(e => e.severity === 'critical');
      
      return {
        total: all.length,
        unresolved: unresolved.length,
        critical: critical.length,
        byType: {
          runtime: all.filter(e => e.error_type === 'runtime').length,
          network: all.filter(e => e.error_type === 'network').length,
          database: all.filter(e => e.error_type === 'database').length,
          auth: all.filter(e => e.error_type === 'auth').length,
          validation: all.filter(e => e.error_type === 'validation').length,
          unknown: all.filter(e => e.error_type === 'unknown').length
        }
      };
    } catch (err) {
      console.error('Failed to get stats:', err);
      return null;
    }
  }
}

export default ErrorLogger;