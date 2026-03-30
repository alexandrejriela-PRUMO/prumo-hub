import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function GoogleCalendarConnect({ user }) {
  const [copied, setCopied] = useState(false);

  // Link para conectar via shared connector (já autorizado)
  const authLink = `${window.location.origin}/auth/googlecalendar`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(authLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copiado!');
  };

  const handleConnect = () => {
    window.open(authLink, '_blank', 'width=600,height=600');
  };

  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Conecte sua agenda pessoal do Google Calendar para sincronizar eventos na plataforma.
          </p>
          <Button
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={handleConnect}
          >
            <Calendar className="w-3.5 h-3.5 mr-2" />
            Conectar Google Calendar
          </Button>
          <details className="text-xs">
            <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
              Copiar link de autorização
            </summary>
            <div className="mt-2 p-2 bg-white rounded border border-blue-100 space-y-2">
              <p className="text-gray-600">Cole este link no seu navegador:</p>
              <div className="flex items-center gap-1 bg-gray-50 p-2 rounded">
                <code className="text-xs text-gray-700 flex-1 truncate">{authLink}</code>
                <button
                  onClick={copyToClipboard}
                  className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                  title={copied ? 'Copiado!' : 'Copiar'}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}