import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Plus, User, FileText, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProcessHistory({ process, onAddUpdate }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    date: new Date().toISOString().split('T')[0],
    responsible: '',
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddUpdate(newUpdate);
    setNewUpdate({
      date: new Date().toISOString().split('T')[0],
      responsible: '',
      description: ''
    });
    setDialogOpen(false);
  };

  const updates = process.updates || [];

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Histórico de Andamentos
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Andamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={newUpdate.date}
                    onChange={(e) => setNewUpdate({ ...newUpdate, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Input
                    value={newUpdate.responsible}
                    onChange={(e) => setNewUpdate({ ...newUpdate, responsible: e.target.value })}
                    placeholder="Ex: Órgão Ambiental, Advogado, etc."
                    required
                  />
                </div>
                <div>
                  <Label>Descrição do Andamento</Label>
                  <Textarea
                    value={newUpdate.description}
                    onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                    placeholder="Descreva o que aconteceu nesta movimentação"
                    rows={4}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Adicionar Andamento
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {updates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum andamento registrado</p>
            <p className="text-sm mt-1">Adicione movimentações para acompanhar o processo</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((update, index) => (
                <div 
                  key={index}
                  className="relative pl-8 pb-4 border-l-2 border-emerald-200 last:border-l-0 last:pb-0"
                >
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-emerald-600 border-4 border-white" />
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-900">
                          {format(parseISO(update.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {updates.length - index}º movimento
                      </Badge>
                    </div>
                    
                    {update.responsible && (
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-gray-700">
                          <strong>Responsável:</strong> {update.responsible}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {update.description}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}