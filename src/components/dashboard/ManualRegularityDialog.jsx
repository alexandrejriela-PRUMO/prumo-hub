import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, AlertTriangle, Eye, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Diálogo para reavaliação manual de regularidade.
 * Permite ao consultor desativar o cálculo automático e definir um status
 * baseado em análise técnica individual.
 */
export default function ManualRegularityDialog({ property, user, isOpen, onClose, onSaved }) {
  const [status, setStatus] = useState('conforme');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (property) {
      setStatus(property.manual_regularity_status || 'conforme');
      setNotes(property.manual_regularity_notes || '');
    }
  }, [property]);

  const handleSave = async () => {
    if (!property) return;
    setSaving(true);
    try {
      await base44.entities.Property.update(property.id, {
        manual_regularity_enabled: true,
        manual_regularity_status: status,
        manual_regularity_notes: notes,
        manual_regularity_date: new Date().toISOString(),
        manual_regularity_by: user?.email,
      });
      toast.success('Reavaliação manual aplicada com sucesso.');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar reavaliação: ' + (err.message || 'tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!property) return;
    setSaving(true);
    try {
      await base44.entities.Property.update(property.id, {
        manual_regularity_enabled: false,
        manual_regularity_status: null,
        manual_regularity_notes: null,
        manual_regularity_date: null,
        manual_regularity_by: null,
      });
      toast.success('Cálculo automático de regularidade reativado.');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error('Erro ao reativar cálculo automático: ' + (err.message || 'tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = [
    { value: 'conforme', label: 'Em Conformidade', icon: ShieldCheck, desc: 'Propriedade regular após análise técnica', color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' },
    { value: 'attention', label: 'Em Atenção', icon: Eye, desc: 'Pendências menores, não críticas', color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' },
    { value: 'critical', label: 'Crítica', icon: AlertTriangle, desc: 'Pendências graves identificadas', color: 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' },
  ];

  const isCurrentlyManual = property?.manual_regularity_enabled;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Reavaliação Manual de Regularidade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1 -mr-1">
          {/* Info da propriedade */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{property?.property_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{property?.city}/{property?.state}</p>
          </div>

          {isCurrentlyManual && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Esta propriedade está com reavaliação manual ativa desde {property?.manual_regularity_date ? new Date(property.manual_regularity_date).toLocaleDateString('pt-BR') : 'data indisponível'}.
              </p>
            </div>
          )}

          {/* Seleção de status */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status da análise técnica</p>
            <div className="space-y-2">
              {statusOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? `${opt.color} ring-2 ring-offset-1`
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isSelected ? '' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notas técnicas */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notas da análise técnica</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva os critérios técnicos considerados na reavaliação..."
              rows={3}
              className="resize-none"
            />
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            Ao ativar a reavaliação manual, o termômetro automático será desativado para esta propriedade e o status selecionado será exibido no dashboard.
          </p>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 pt-2 border-t border-gray-100 dark:border-slate-700/50">
          {isCurrentlyManual && (
            <Button
              variant="outline"
              onClick={handleDisable}
              disabled={saving}
              className="w-full sm:w-auto text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Reativar Automático
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-1.5" />}
            Aplicar Reavaliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}