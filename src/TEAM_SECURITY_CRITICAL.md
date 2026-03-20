# 🔒 SEGURANÇA CRÍTICA — Sistema de Equipes PRUMO Hub

## ⚠️ REGRA SUPREMA

**Nenhum usuário_equipe acessa dados de outro consultor ou de produtor global.**

```js
// ❌ ERRADO — pega dados de TODOS os consultores
const data = await base44.entities.CarbonCredit.list();

// ✅ CORRETO — filtra por consultor_email DO USUÁRIO EQUIPE
const user = await base44.auth.me();
const userTeamInfo = await getTeamMemberInfo(user.email);
const data = await base44.entities.CarbonCredit.filter({
  consultor_email: userTeamInfo.consultor_email
});
```

---

## 1️⃣ FLUXO DE AUTENTICAÇÃO EQUIPE

### Quando usuário equipe faz login:
1. Sistema detecta `user.user_type === 'equipe'`
2. Busca `TeamMember` onde `member_email === user.email` e `status === 'Ativo'`
3. Extrai `primary_user_email` (seu consultor)
4. **Armazena em sessão ou context:**
   ```js
   user.linked_consultant = member.primary_user_email;
   user.member_role = member.member_role;
   user.permissions = member.permissions;
   ```

---

## 2️⃣ FILTRO DE SEGURANÇA EM TODOS MÓDULOS

### Padrão obrigatório em CADA página/componente:

```js
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

export default function CarbonCredits() {
  const { user, linkedConsultant, memberRole, permissions } = useEffectiveUser();
  
  // ✅ Validar permissão ANTES de qualquer query
  if (!permissions?.advanced_modules?.access) {
    return <AccessDeniedPage />;
  }

  // ✅ SEMPRE filtrar por consultor_email
  const { data: credits } = useQuery({
    queryKey: ['carbonCredits', linkedConsultant],
    queryFn: () => base44.entities.CarbonCredit.filter({
      consultor_email: linkedConsultant
    }),
    enabled: !!linkedConsultant,
  });

  return <div>{/* UI */}</div>;
}
```

---

## 3️⃣ HOOK `useEffectiveUser` (OBRIGATÓRIO)

**Localização:** `hooks/useEffectiveUser.js`

```js
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export function useEffectiveUser() {
  const [state, setState] = useState({
    user: null,
    linkedConsultant: null,
    memberRole: null,
    permissions: {},
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();
        
        // Se for consultor, linkedConsultant = seu próprio email
        if (user.user_type === 'consultor') {
          setState(s => ({ ...s, 
            user, 
            linkedConsultant: user.email,
            isLoading: false 
          }));
          return;
        }

        // Se for equipe, buscar TeamMember
        if (user.user_type === 'equipe') {
          const members = await base44.asServiceRole.entities.TeamMember.filter({
            member_email: user.email,
            status: 'Ativo'
          });
          
          if (members.length === 0) {
            throw new Error('Nenhuma filiação de equipe ativa encontrada');
          }
          
          const member = members[0];
          setState(s => ({ ...s, 
            user,
            linkedConsultant: member.primary_user_email,
            memberRole: member.member_role,
            permissions: member.permissions || {},
            isLoading: false
          }));
          return;
        }

        // Se for produtor, não tem acesso a estes módulos
        setState(s => ({ ...s, 
          user, 
          linkedConsultant: null,
          isLoading: false 
        }));
      } catch (error) {
        setState(s => ({ ...s, 
          error: error.message, 
          isLoading: false 
        }));
      }
    };
    load();
  }, []);

  return state;
}
```

---

## 4️⃣ COMPONENTE DE PROTEÇÃO DE ACESSO

**Localização:** `components/AccessGuardTeam.jsx`

```js
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { AlertCircle } from 'lucide-react';

export default function AccessGuardTeam({ 
  children, 
  requiredModules = [], 
  requiredRole = null 
}) {
  const { user, memberRole, permissions, linkedConsultant, isLoading, error } = useEffectiveUser();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (error || !linkedConsultant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-semibold">Acesso negado</p>
          <p className="text-sm text-gray-600">{error || 'Você não tem filiação ativa'}</p>
        </div>
      </div>
    );
  }

  // Validar role se necessário
  if (requiredRole && memberRole !== requiredRole) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-yellow-700 font-semibold">Permissão insuficiente</p>
          <p className="text-sm text-gray-600">Só {requiredRole} pode acessar isso</p>
        </div>
      </div>
    );
  }

  // Validar módulos se necessário
  for (const module of requiredModules) {
    if (!permissions?.[module]?.access && !permissions?.[module]?.view) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-semibold">Módulo não permitido</p>
            <p className="text-sm text-gray-600">Você não tem permissão para acessar este módulo</p>
          </div>
        </div>
      );
    }
  }

  return children;
}
```

---

## 5️⃣ CHECKLIST DE SEGURANÇA — Módulos a Atualizar

### ✅ Deve ter filtro `consultor_email` OBRIGATÓRIO:
- [ ] CarbonCredits
- [ ] PSAContracts
- [ ] EnvironmentalEasements
- [ ] ESGAgro
- [ ] CRA
- [ ] RuralCredit
- [ ] HarvestLoss
- [ ] Contracts
- [ ] Documents/DocumentsHub
- [ ] Licenses
- [ ] PRAD
- [ ] Georeferencing

### ✅ Deve ter validação `AccessGuardTeam`:
- [ ] Todas as páginas acima

### ✅ Deve usar `useEffectiveUser()`:
- [ ] Todos componentes que acessam entidades

---

## 6️⃣ EXEMPLO: Implementação em `CarbonCredits.jsx`

```js
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import AccessGuardTeam from '@/components/AccessGuardTeam';

export default function CarbonCredits() {
  return (
    <AccessGuardTeam requiredModules={['advanced_modules']}>
      <CarbonCreditsContent />
    </AccessGuardTeam>
  );
}

function CarbonCreditsContent() {
  const { linkedConsultant } = useEffectiveUser();
  
  const { data: credits = [] } = useQuery({
    queryKey: ['carbonCredits', linkedConsultant],
    queryFn: () => base44.entities.CarbonCredit.filter({
      consultor_email: linkedConsultant
    }),
    enabled: !!linkedConsultant,
  });

  return <div>{/* UI */}</div>;
}
```

---

## 7️⃣ TESTES DE SEGURANÇA OBRIGATÓRIOS

```js
// ✅ Test 1: Usuário equipe não acessa dados de outro consultor
const equipeUser = { email: 'engenheiro@example.com', user_type: 'equipe' };
const credits = await getCarbonCredits(equipeUser);
// ❌ Deve retornar ERRO 403 ou array vazio

// ✅ Test 2: Usuário equipe acessa APENAS dados do seu consultor
const ownData = await getCarbonCredits(equipeUser);
// ✅ Todos com `consultor_email === 'seu_consultor@example.com'`

// ✅ Test 3: Estagiário não acessa advanced_modules
const stagiairePermissions = { advanced_modules: { access: false } };
// ❌ Page deve retornar <AccessDenied />
```

---

## 8️⃣ LOGS & AUDITORIA

Toda query filtrada deve logar:
```js
console.log(`[SecurityFilter] User: ${user.email}, Consultant: ${linkedConsultant}, Module: CarbonCredits`);
```

---

## 🔴 CRÍTICO: Não deixar passar

- ❌ `CarbonCredit.list()` sem filtro
- ❌ `CarbonCredit.filter({})` vazio
- ❌ `useQuery()` sem `linkedConsultant` como dependency
- ❌ Componente sem `AccessGuardTeam`
- ❌ Usuário equipe vendo dados globais de produtor

---

**Status:** IMPLEMENTAR AGORA
**Prioridade:** 🔴 CRÍTICA
**Impacto:** Segurança de dados, conformidade