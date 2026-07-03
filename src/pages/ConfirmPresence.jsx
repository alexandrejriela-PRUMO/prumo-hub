import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appParams } from '@/lib/app-params';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Calendar } from 'lucide-react';

const CONFIRM_PRESENCE_URL = `${appParams.appBaseUrl}/functions/confirmPresence`;

export default function ConfirmPresence() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [interaction, setInteraction] = useState(null);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    const findInteraction = async () => {
      try {
        const res = await fetch(CONFIRM_PRESENCE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setStatus(data.error === 'not_found' ? 'not_found' : 'error');
          return;
        }
        setInteraction({
          title: data.title,
          meeting_datetime: data.meeting_datetime,
          description: data.description,
        });
        if (data.status === 'confirmed') setStatus('already_confirmed');
        else if (data.status === 'declined') setStatus('already_declined');
        else setStatus('pending');
      } catch (e) {
        setStatus('error');
      }
    };
    if (token) findInteraction();
  }, [token]);

  const respond = async (answer) => {
    setResponding(true);
    try {
      const res = await fetch(CONFIRM_PRESENCE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, response: answer }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus('error');
        return;
      }
      setStatus(data.status === 'confirmed' ? 'confirmed' : 'declined');
    } catch (e) {
      setStatus('error');
    } finally {
      setResponding(false);
    }
  };
  const dtStr = interaction?.meeting_datetime
    ? new Date(interaction.meeting_datetime).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })
    : null;

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );

  if (status === 'not_found' || status === 'error') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-8 pb-8 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">Link invalido ou expirado.</p>
        </CardContent>
      </Card>
    </div>
  );

  if (status === 'confirmed') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full mx-4"><CardContent className="pt-8 pb-8 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Presenca Confirmada!</h2>
        <p className="text-gray-600">Ate breve!</p>
      </CardContent></Card>
    </div>
  );

  if (status === 'declined') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full mx-4"><CardContent className="pt-8 pb-8 text-center">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Presenca Recusada</h2>
        <p className="text-gray-600">Obrigado por avisar. Entraremos em contato.</p>
      </CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <img src="/logo.png" alt="PRUMO" className="h-10 mx-auto mb-3" onError={e=>e.target.style.display='none'} />
          <CardTitle className="text-xl">Confirmacao de Presenca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-gray-900">{interaction?.title}</p>
            {dtStr && <p className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="w-4 h-4" />{dtStr}</p>}
            {interaction?.description && <p className="text-sm text-gray-600">{interaction.description}</p>}
          </div>
          {status === 'already_confirmed' && <p className="text-center text-emerald-600 font-medium">Voce ja confirmou presenca!</p>}
          {status === 'already_declined' && <p className="text-center text-red-500 font-medium">Voce ja recusou este encontro.</p>}
          {status === 'pending' && (
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={()=>respond('confirmed')} disabled={responding} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle className="w-4 h-4 mr-2" />Confirmar</Button>
              <Button onClick={()=>respond('declined')} disabled={responding} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"><XCircle className="w-4 h-4 mr-2" />Recusar</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
