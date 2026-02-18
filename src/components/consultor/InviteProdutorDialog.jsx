import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InviteProdutorDialog({ property, open, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const response = await base44.functions.invoke('inviteProdutor', {
      email,
      property_id: property.id,
    });
    setLoading(false);

    if (response.data?.success) {
      setDone(true);
      toast.success(`Convite enviado para ${email}!`);
    } else {
      toast.error(response.data?.error || 'Erro ao enviar convite.');
    }
  };

  const handleClose = () => {
    setEmail('');
    setDone(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Convidar Produtor
          </DialogTitle>
          <DialogDescription>
            Convide o produtor responsável pela propriedade <strong>{property?.property_name}</strong>.
            Ele receberá um email de acesso ao sistema.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="font-semibold text-gray-800">Convite enviado com sucesso!</p>
            <p className="text-sm text-gray-500">
              O produtor receberá um e-mail com as instruções de acesso.
            </p>
            <Button onClick={handleClose} className="mt-2 bg-emerald-600 hover:bg-emerald-700">
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="produtor-email">E-mail do Produtor</Label>
              <Input
                id="produtor-email"
                type="email"
                required
                placeholder="produtor@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" /> Enviar Convite</>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}