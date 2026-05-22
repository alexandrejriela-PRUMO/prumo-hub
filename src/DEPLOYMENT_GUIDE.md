# Guia de Implantação - Fixes PRUMO Hub

## 🚀 Checklist de Implantação

### ✅ Fase 1: Validação (Imediata)
- [x] 3 novas funções backend criadas
- [x] Componentes existentes atualizados com fallbacks gracioso
- [x] Nenhuma breaking change
- [x] Compatibilidade 100% mantida

### ✅ Fase 2: Ativação Automática (Próximo Login)

#### Para tidiroos@gmail.com
1. tidiroos faz login normalmente
2. `applyInviteConfigOnFirstLogin` é chamado automaticamente
3. Nova função `persistTeamMemberUserType` sincroniza em 3 fontes
4. tidiroos agora tem `equipe_produtor` **persistido** em:
   - ✅ User (auth)
   - ✅ UserMetadata (storage)
   - ✅ TeamMember (rastreabilidade)

**Resultado**: Próximos logins de tidiroos sempre reconhecem como `equipe_produtor`

#### Para Arquivos
1. Usuário clica "Baixar" ou "Visualizar" arquivo
2. `SupabaseFileLink` chama `validateAndMigrateStorageToR2`
3. Sistema detecta se arquivo está em Supabase
4. **Se Supabase**: Migra automaticamente para R2 e salva path
5. **Se R2**: Valida e usa path existente
6. Download/visualização funciona

**Resultado**: Primeira tentativa de download migra; todas subsequentes usam R2 direto

### ⚙️ Fase 3: Limpeza Completa (Recomendada - 1x como Admin)

**Executar 1 vez**:
```bash
# Via API ou Admin Panel → Functions
POST /functions/adminMigrateAllFilesToR2Complete

# Resposta esperada:
{
  "success": true,
  "stats": {
    "documents": 150,
    "documentsMigrated": 150,
    "licenses": 45,
    "licensesMigrated": 45,
    "mappings": 320,
    "mappingsMigrated": 320,
    "prad": 12,
    "pradMigrated": 12,
    "georef": 8,
    "georefMigrated": 8,
    "errors": []
  }
}
```

**O que faz**:
- Percorre TODOS os documentos em base44
- Migra Supabase → R2 para cada arquivo
- Atualiza referências no banco
- Retorna estatísticas

---

## 🧪 Plano de Testes

### Teste 1: Sincronização de tidiroos

**Pré-requisito**: tidiroos@gmail.com está vinculada como equipe_produtor a denisoncds

**Steps**:
1. Tidiroos faz login em browser A → deverá ver dados de "Fazenda Roos"
2. Fecha browser A completamente (todas as abas)
3. Abre browser B (ou janela privada) e faz login como tidiroos
4. **Esperado**: ✅ Ainda vê "Fazenda Roos", não oscila

**Validação técnica**:
```javascript
// No console do browser:
const user = await base44.auth.me();
console.log(user.user_type); // Deve ser: "equipe_produtor"

// Verificar persistência:
const res = await base44.functions.invoke('getEffectiveUser', {});
console.log(res.data.user_type); // Deve ser: "equipe_produtor"
```

### Teste 2: Upload e Download de Arquivo TIFF

**Pré-requisito**: Estar em página de Mappings com uma propriedade selecionada

**Steps**:
1. Clica "Novo Mapeamento"
2. Preenche campos básicos
3. Clica "Selecionar Arquivo" (TIFF ou PDF grande)
4. **Esperado**: ✅ Upload completa sem erro "Erro ao ler arquivo"
5. Clica "Salvar Mapeamento"
6. No card do mapeamento, clica "Baixar" arquivo
7. **Esperado**: ✅ Download funciona (não é "aplicação/octet-stream")
8. Fecha página, volta para Mappings
9. Clica "Visualizar" no mesmo arquivo
10. **Esperado**: ✅ Abre em nova aba, não é branco em branco

**Validação técnica**:
```javascript
// No console durante download:
// Deve ver logs como:
// [FileLink] Path validado: ... → ...
// [FileUpload] Progresso: 40%, 80%, 100%
```

### Teste 3: Migração Massiva (Admin)

**Pré-requisito**: Estar logado como admin

**Steps**:
1. Abre Functions → `adminMigrateAllFilesToR2Complete`
2. Clica "Testar Função"
3. Aguarda conclusão (tempo varia por volume)
4. **Esperado**: ✅ Status 200, stats mostra números migrados
5. Verifica um documento legado via Licenses page
6. Clica download → **Esperado**: ✅ Arquivo migrado agora em R2

---

## 📊 Logs para Monitorar

### Backend Logs a Monitorar

```
[persistTeamMemberUserType] User atualizado: tidiroos@gmail.com → equipe_produtor
[persistTeamMemberUserType] UserMetadata atualizado: tidiroos@gmail.com
[getEffectiveUser] user_type sincronizado via getEffectiveUser: equipe_produtor

[FileLink] Path validado: ... → ...
[validateAndMigrateStorageToR2] Arquivo migrado de Supabase para R2
[adminMigrateAllFilesToR2Complete] Concluído: stats {...}
```

### Frontend Console Logs

```
[FileUpload] Erro na conversão: ... (se houver erro TIFF)
[FileLink] Path validado: ... → ... (migration attempt)
[applyInviteConfigOnFirstLogin] user_type persistido via persistTeamMemberUserType
```

---

## ⚠️ Rollback (Se Necessário)

Se algo der errado, o sistema tem **fallbacks automáticos**:

1. **tidiroos oscilando novamente?**
   - Deletar UserMetadata de tidiroos
   - tidiroos faz logout + login
   - Sistema recriar e persiste via `persistTeamMemberUserType`

2. **Arquivo ainda dá erro?**
   - Supabase file legado ainda está acessível (fallback)
   - Sistema tenta Supabase se R2 falhar
   - Manual: fazer upload novamente do arquivo (Supabase → R2)

3. **Migração massiva falhou parcialmente?**
   - Reexecute `adminMigrateAllFilesToR2Complete`
   - Sistema skippa o que já migrou (idempotente)
   - Continua de onde parou

---

## 📞 Suporte

Se notar algum dos problemas abaixo, contact dev:

- ❌ tidiroos oscila em logins diferentes
- ❌ Arquivo TIFF dá erro ao fazer upload
- ❌ Download/visualização de arquivo antigo falha
- ❌ `adminMigrateAllFilesToR2Complete` retorna 500 error

**Informações úteis para suporte**:
- Email do usuário
- ID do arquivo/mapeamento
- Screenshot do erro
- Browser e SO

---

## 🎯 Success Criteria

✅ **Tudo funcionando quando**:
- tidiroos faz login em múltiplos browsers sem oscilar
- Upload de TIFF completa sem erro
- Download/visualização de arquivo legado funciona
- Admin consegue migrar todos os arquivos

---

**Data de Implantação**: 2026-05-22  
**Status**: 🟢 PRONTO PARA PRODUÇÃO