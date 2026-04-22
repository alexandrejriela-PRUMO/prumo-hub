# Guia de Implementação: Form Dirty Alert

## Visão Geral
Sistema de alerta para proteger formulários contra saída abrupta sem salvamento de dados. Aplicável a Agenda, CRM, Propriedades, Contratos, Documentos, Transações Financeiras, e todos os módulos com formulários.

## Como Usar

### 1. Importar o Hook
```javascript
import { useFormDirtyAlert, useDialogDirtyAlert } from '@/hooks/useFormDirtyAlert';
```

### 2. Rastrear Mudanças no Formulário

```javascript
const [formData, setFormData] = useState({...});
const [initialFormData, setInitialFormData] = useState(null);

// Detectar se há mudanças
const isFormDirty = initialFormData && JSON.stringify(formData) !== JSON.stringify(initialFormData);

// Proteger navegação (página toda)
useFormDirtyAlert(isFormDirty);

// Proteger dialog/modal
const handleCloseDialog = useDialogDirtyAlert(
  isFormDirty,
  () => { setDialogOpen(false); resetForm(); },
  'Mensagem customizada (opcional)'
);
```

### 3. Capturar Estado Inicial

Quando abrir um formulário (novo ou edição), capture o estado inicial:

```javascript
// Para novo registro
const resetForm = () => {
  const freshData = { /* dados vazios */ };
  setFormData(freshData);
  setInitialFormData(freshData);
};

// Para edição
const openEditDialog = (item) => {
  const editData = { /* dados do item */ };
  setFormData(editData);
  setInitialFormData(editData); // ← IMPORTANTE
  setEditDialogOpen(true);
};
```

### 4. Proteger Dialog/Modal

```javascript
<Dialog open={dialogOpen} onOpenChange={(open) => {
  if (!open && isFormDirty) {
    const confirmed = window.confirm(
      'Você tem alterações não salvas. Deseja fechar sem salvar?'
    );
    if (!confirmed) return; // Não fecha
  }
  setDialogOpen(open);
  if (!open) resetForm(); // Limpar ao fechar
}}>
  {/* conteúdo do dialog */}
</Dialog>
```

## Páginas a Implementar

### Priority 1 (Críticas)
- [ ] pages/Agenda
- [ ] pages/CRMBoard
- [ ] pages/PropertyCentral
- [ ] pages/Contracts
- [ ] pages/ContractGenerator
- [ ] pages/BudgetGenerator

### Priority 2 (Importantes)
- [ ] pages/DocumentsHub
- [ ] pages/FinancialTransactions
- [ ] pages/Properties
- [ ] pages/Processes
- [ ] pages/Licenses (✓ Já implementado)

### Priority 3 (Adicionais)
- [ ] pages/Mappings
- [ ] pages/CARModule
- [ ] pages/PRAD
- [ ] pages/EnvironmentalAssets
- [ ] pages/CarbonCredits
- [ ] pages/RuralCredit
- [ ] pages/HarvestLoss

## Comportamento Esperado

### Navegação (React Router)
- Ao clicar em link para outra página → Alerta `beforeunload`
- Ao pressionar back → Alerta `popstate`
- Ao fechar aba/F5 → Alerta `beforeunload`

### Dialog/Modal
- Ao clicar X ou fora do dialog → Alerta customizado
- Confirmação: "Continuar" (fecha) ou "Cancelar" (mantém aberto)

### Submissão
- Após sucesso: `resetForm()` → `setDialogOpen(false)`
- Limpa `initialFormData` para evitar falsos positivos

## Exemplo Completo

```javascript
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFormDirtyAlert } from '@/hooks/useFormDirtyAlert';

export default function MyFormPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [initialFormData, setInitialFormData] = useState(null);

  // Detectar mudanças
  const isFormDirty = initialFormData && 
    JSON.stringify(formData) !== JSON.stringify(initialFormData);

  // Proteger navegação
  useFormDirtyAlert(isFormDirty);

  const resetForm = () => {
    const fresh = { name: '', email: '' };
    setFormData(fresh);
    setInitialFormData(fresh);
  };

  const openDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // salvar dados...
    resetForm(); // Limpar após sucesso
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      if (!open && isFormDirty) {
        if (!window.confirm('Alterações não salvas. Sair?')) return;
      }
      setDialogOpen(open);
      if (!open) resetForm();
    }}>
      <button onClick={openDialog}>Novo</button>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <input 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <Button type="submit">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Testes Manuais

1. **Preencher form + Navegar**: Deve alertar
2. **Preencher form + Fechar dialog**: Deve alertar
3. **Preencher form + Fechar aba**: Deve alertar
4. **Salvar + Fechar**: Não deve alertar
5. **Não preencher + Fechar**: Não deve alertar

## Notas

- Hook detecta mudanças por comparação stringificada de objetos
- Para formulários muito grandes, considerar rastreamento granular
- Mensagem de alerta é customizável
- Compatível com todos os browsers modernos