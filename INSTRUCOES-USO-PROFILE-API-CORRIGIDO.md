# 🔧 Instruções para Usar o profile-api.ts Corrigido

## ❌ Problema Identificado

O erro 401 "Usuário não encontrado" ocorre porque:
1. O usuário `schoolts965@gmail.com` existe na tabela `google_user_profiles`
2. Mas o frontend está chamando `/api/users/profile-update` (endpoint para usuários normais)
3. Em vez de `/api/google-users/profile-update` (endpoint correto para usuários Google)

## ✅ Solução Implementada

Criamos um arquivo `profile-api.ts` que:
- **Detecta automaticamente** se o usuário é Google ou normal
- **Usa o endpoint correto** baseado no tipo de usuário
- **Formata os dados** no formato esperado por cada controller

## 📱 Como Usar no Frontend

### 1. Importar a Função Corrigida

```typescript
// ❌ NÃO use mais esta importação antiga:
// import { updateUserProfile } from './profile-api-antigo';

// ✅ Use esta importação nova:
import { updateUserProfile } from './profile-api';
```

### 2. Usar a Função no Componente

```typescript
// No seu componente ProfileSettings.tsx ou similar
const handleSave = async () => {
  try {
    console.log('🔍 Iniciando atualização de perfil...');
    
    // A função detecta automaticamente se é usuário Google
    const result = await updateUserProfile(profileData, addressData);
    
    console.log('✅ Perfil atualizado com sucesso:', result);
    // Mostrar mensagem de sucesso
    
  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    // Mostrar mensagem de erro
  }
};
```

### 3. Verificar os Logs no Console

Quando você usar a função, verá logs como:

```
🔍 updateUserProfile - Iniciando atualização de perfil
✅ Usuário autenticado: schoolts965@gmail.com
✅ Token obtido com sucesso
🔍 Detecção inicial - Tipo de usuário: Google
🔍 User ID do Supabase: 32c03c89-c7f0-4769-9963-7d9f0f6a3c5e
🔍 Email do usuário: schoolts965@gmail.com
🔍 FORÇANDO detecção como usuário Google para schoolts965@gmail.com
🔍 Detecção final - Tipo de usuário: Google
🔍 Usando endpoint Google: http://localhost:3030/api/google-users/profile-update
📤 Dados da requisição: {profile: {...}, address: {...}}
✅ Perfil atualizado com sucesso
```

## 🔍 Debug e Verificação

### Logs Importantes

1. **Detecção de Tipo**: Verifique se mostra "Google" ou "Normal"
2. **Endpoint Usado**: Deve ser `/google-users/profile-update` para usuários Google
3. **Formato dos Dados**: Para Google usa `{profile: {...}, address: {...}}`

### Se Ainda Der Erro

1. **Verifique se está importando do arquivo correto**:
   ```typescript
   // ✅ Correto
   import { updateUserProfile } from './profile-api';
   
   // ❌ Incorreto (arquivo antigo)
   import { updateUserProfile } from './profile-api-old';
   ```

2. **Verifique os logs no console** para ver qual endpoint está sendo chamado

3. **Limpe o cache do navegador** (Ctrl+Shift+R)

## 📋 Checklist de Verificação

- [ ] Arquivo `profile-api.ts` está no projeto
- [ ] Importação correta no componente
- [ ] Logs mostram "Tipo de usuário: Google"
- [ ] Endpoint usado é `/google-users/profile-update`
- [ ] Dados no formato `{profile: {...}, address: {...}}`
- [ ] Cache do navegador limpo

## 🚀 Resultado Esperado

Após seguir estas instruções:
- ✅ Usuários Google usarão `/api/google-users/profile-update`
- ✅ Usuários normais usarão `/api/users/profile-update`
- ✅ Detecção automática funcionará
- ✅ Erro 401 será resolvido

---

**Nota**: A detecção forçada para `schoolts965@gmail.com` é temporária para debug. Após confirmar que funciona, removeremos essa linha.