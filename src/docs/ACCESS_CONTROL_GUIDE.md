# Guia de Controle de Acesso

## Estrutura de Usuários

- **Consultor**: Pagante, acesso completo
- **Produtor**: Pagante, acesso completo
- **Equipe**: Não-pagante, dependente de Consultor/Produtor, herda do principal
- **Client_Consultor**: Não-pagante, dependente de Consultor, acesso somente-leitura

## Como Usar

### 1. Proteger Rotas (Páginas)

Use `RouteProtector` para bloquear acesso a páginas específicas:

```jsx
import RouteProtector from '@/components/RouteProtector';

<Route path="/proprietary-page" element={
  <LayoutWrapper currentPageName="ProprietaryPage">
    <RouteProtector user={user} pageName="ProprietaryPage">
      <ProprietaryPage />
    </RouteProtector>
  </LayoutWrapper>
} />
```

### 2. Proteger Ações (Botões/Edições)

Use `ProtectedButton` para botões que exigem permissão:

```jsx
import { ProtectedButton } from '@/components/ActionProtector';

<ProtectedButton
  user={user}
  action="edit"
  onClick={() => handleEdit()}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
>
  Editar
</ProtectedButton>
```

### 3. Proteger Seções

Use `ProtectedSection` para ocultar partes da UI:

```jsx
import { ProtectedSection } from '@/components/ActionProtector';

<ProtectedSection
  user={user}
  action="delete"
  fallback={<div>Você não tem permissão para deletar.</div>}
>
  <button onClick={handleDelete}>Deletar</button>
</ProtectedSection>
```

### 4. Validar no Backend

Chame as funções de validação antes de fazer operações sensíveis:

```jsx
// Validar convite
const response = await base44.functions.invoke('validateInvitePermissions', {
  targetUserType: 'client_consultor'
});

if (!response.data.allowed) {
  toast.error(response.data.message);
  return;
}

// Validar pagamento
const payResponse = await base44.functions.invoke('validatePaymentEligibility', {});

if (!payResponse.data.eligible) {
  toast.error(payResponse.data.message);
  return;
}

// Validar acesso a página
const pageResponse = await base44.functions.invoke('validatePageAccess', {
  pageName: 'AdminPanel'
});

if (!pageResponse.data.allowed) {
  navigate('/');
  return;
}
```

## Permissões por Tipo

### Client_Consultor
- ✅ Visualizar propriedades, documentos, licenças, processos
- ✅ Baixar documentos
- ✅ Ver alertas e relatórios
- ❌ Editar dados
- ❌ Deletar dados
- ❌ Convidar usuários

### Equipe
- ✅ Acesso igual ao Consultor/Produtor principal
- ✅ Pode editar/deletar conforme permissões da equipe
- ❌ Não pode convidar usuários

### Consultor/Produtor
- ✅ Acesso completo
- ✅ Pode convidar Equipe e Client_Consultor
- ✅ Pode pagar por assinatura

## Páginas Permitidas

### Client_Consultor
- PropertyCentral
- DocumentsHub
- Licenses
- Processes
- EnvironmentalAlerts
- RegularityReport
- PRAD
- Georeferencing
- Mappings
- ClimateMonitoring
- CarbonCredits
- PSAContracts
- EnvironmentalAssets
- EnvironmentalEasements

### Consultor/Produtor
- ✅ Todas as páginas

### Equipe
- ✅ Herda do principal

## Ações Permitidas

### Client_Consultor
```json
{
  "view": true,
  "download": true,
  "edit": false,
  "delete": false,
  "invite": false
}
```

### Equipe/Consultor/Produtor
```json
{
  "view": true,
  "download": true,
  "edit": true,
  "delete": true,
  "invite": true (apenas Consultor/Produtor)
}
```

## Convites

### Quem pode convidar quem

- **Consultor** pode convidar: `equipe`, `client_consultor`
- **Produtor** pode convidar: `equipe`
- **Equipe**: não pode convidar ninguém
- **Client_Consultor**: não pode convidar ninguém

## Billing

- Apenas **Consultor** e **Produtor** podem pagar
- **Equipe** e **Client_Consultor** são não-pagantes