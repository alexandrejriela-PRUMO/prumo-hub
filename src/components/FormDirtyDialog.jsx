import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCallback } from 'react';

/**
 * Wrapper para Dialog que protege contra saída sem salvamento
 * Uso: <FormDirtyDialog isDirty={isDirty} onOpenChange={...}>
 */
export function FormDirtyDialog({
  isDirty = false,
  onOpenChange,
  open,
  children,
  title,
  alertMessage = 'Você tem alterações não salvas. Deseja fechar sem salvar?'
}) {
  const handleOpenChange = useCallback((newOpen) => {
    if (!newOpen && isDirty) {
      const confirmed = window.confirm(alertMessage);
      if (!confirmed) {
        return; // Não fecha o dialog
      }
    }
    onOpenChange?.(newOpen);
  }, [isDirty, alertMessage, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children}
    </Dialog>
  );
}

/**
 * Componente para confirmar fechamento com dados não salvos
 * Pode ser usado em qualquer contexto (modal, drawer, etc)
 */
export function UnsavedChangesAlert({
  isDirty = false,
  onConfirmClose,
  customMessage = 'Você tem alterações não salvas. Deseja realmente descartar as mudanças?',
  title = 'Alterações não salvas'
}) {
  if (!isDirty) return null;

  const handleDiscard = () => {
    if (onConfirmClose) {
      onConfirmClose();
    }
  };

  const handleKeepEditing = () => {
    // Apenas fechar o alerta, mantém o formulário aberto
  };

  return (
    <Dialog open={isDirty} onOpenChange={handleDiscard}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 py-4">{customMessage}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleKeepEditing}>
            Continuar editando
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDiscard}
            className="bg-red-600 hover:bg-red-700"
          >
            Descartar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}