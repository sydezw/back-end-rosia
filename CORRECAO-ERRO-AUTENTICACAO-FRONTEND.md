# Correção - Erro "Usuário não autenticado" no Frontend

## 🚨 Problema Identificado

O erro `"Usuário não autenticado"` na linha 77 do `profile-api.ts` indica que o frontend não está conseguindo obter o token de autenticação do Supabase.

### Erro Completo:
```
❌ Erro ao atualizar perfil: Error: Usuário não autenticado
    at updateUserProfile (profile-api.ts:77:13)
```

## 🔍 Causa do Problema

O código está tentando obter a sessão do Supabase, mas:
1. A sessão pode estar expirada
2. O usuário pode não estar logado
3. O token pode estar inválido
4. A configuração do Supabase pode estar incorreta

## ✅ Soluções

### 1. Verificar Configuração do Supabase

**Arquivo: `supabaseClient.js` ou `supabaseClient.ts`**

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Verificar arquivo `.env`:**
```env
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

### 2. Corrigir Função de Atualização de Perfil

**Arquivo: `profile-api.ts` (ou onde está a função)**

```typescript
import { supabase } from './supabaseClient';

const updateUserProfile = async (profileData: any, addressData: any = null) => {
  try {
    console.log('🔍 Verificando autenticação...');
    
    // Verificar se o usuário está logado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Erro ao verificar usuário:', userError);
      throw new Error('Erro de autenticação: ' + userError.message);
    }
    
    if (!user) {
      console.error('❌ Usuário não encontrado');
      throw new Error('Usuário não autenticado. Faça login novamente.');
    }
    
    console.log('✅ Usuário autenticado:', user.email);
    
    // Obter sessão atual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erro ao obter sessão:', sessionError);
      throw new Error('Erro na sessão: ' + sessionError.message);
    }
    
    if (!session?.access_token) {
      console.error('❌ Token de acesso não encontrado');
      throw new Error('Token de acesso inválido. Faça login novamente.');
    }
    
    console.log('✅ Token obtido com sucesso');
    
    // Preparar dados da requisição
    const requestData: any = {};
    
    // Adicionar dados do perfil se fornecidos
    if (profileData) {
      if (profileData.nome) requestData.nome = profileData.nome;
      if (profileData.cpf) requestData.cpf = profileData.cpf;
      if (profileData.telefone) requestData.telefone = profileData.telefone;
      if (profileData.data_nascimento) requestData.data_nascimento = profileData.data_nascimento;
    }
    
    // Adicionar dados do endereço se fornecidos
    if (addressData) {
      if (addressData.nome_endereco) requestData.nome_endereco = addressData.nome_endereco;
      if (addressData.cep) requestData.cep = addressData.cep;
      if (addressData.logradouro) requestData.logradouro = addressData.logradouro;
      if (addressData.numero) requestData.numero = addressData.numero;
      if (addressData.bairro) requestData.bairro = addressData.bairro;
      if (addressData.cidade) requestData.cidade = addressData.cidade;
      if (addressData.estado) requestData.estado = addressData.estado;
      if (addressData.complemento) requestData.complemento = addressData.complemento;
    }
    
    console.log('📤 Enviando dados para atualização:', requestData);
    
    // Fazer requisição para o backend
    const response = await fetch('https://back-end-rosia02.vercel.app/api/users/profile-update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    const data = await response.json();
    console.log('📥 Dados recebidos:', data);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
    
    if (data.success) {
      console.log('✅ Perfil atualizado com sucesso:', data.data);
      return {
        success: true,
        user: data.data.user,
        address: data.data.address,
        updated: data.data.updated,
        message: data.message
      };
    } else {
      throw new Error(data.error?.message || 'Erro desconhecido');
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export { updateUserProfile };
```

### 3. Verificar Estado de Autenticação no Componente

**Arquivo: `ProfileSettings.tsx` (ou componente principal)**

```typescript
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { updateUserProfile } from './profile-api';

const ProfileSettings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Verificar autenticação ao carregar componente
  useEffect(() => {
    checkAuthentication();
    
    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Estado de autenticação mudou:', event, session?.user?.email);
        setIsAuthenticated(!!session?.user);
        setUser(session?.user || null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  const checkAuthentication = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        setIsAuthenticated(false);
        return;
      }
      
      if (user) {
        console.log('✅ Usuário autenticado:', user.email);
        setIsAuthenticated(true);
        setUser(user);
      } else {
        console.log('❌ Usuário não autenticado');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ Erro na verificação:', error);
      setIsAuthenticated(false);
    }
  };
  
  const handleSave = async () => {
    // Verificar autenticação antes de salvar
    if (!isAuthenticated) {
      alert('Você precisa estar logado para salvar as informações.');
      return;
    }
    
    setLoading(true);
    
    try {
      const profileData = {
        nome: 'Nome do usuário',
        cpf: '12345678901',
        telefone: '11987654321'
      };
      
      const addressData = {
        nome_endereco: 'Casa',
        cep: '01234567',
        logradouro: 'Rua das Flores',
        numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP'
      };
      
      const result = await updateUserProfile(profileData, addressData);
      
      if (result.success) {
        alert('Dados salvos com sucesso!');
      } else {
        alert('Erro ao salvar: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      alert('Erro ao salvar dados');
    } finally {
      setLoading(false);
    }
  };
  
  // Mostrar tela de login se não autenticado
  if (!isAuthenticated) {
    return (
      <div className="auth-required">
        <h2>Acesso Restrito</h2>
        <p>Você precisa estar logado para acessar suas informações.</p>
        <button onClick={() => window.location.href = '/login'}>
          Fazer Login
        </button>
      </div>
    );
  }
  
  return (
    <div className="profile-settings">
      <h2>Minhas Informações</h2>
      <p>Usuário: {user?.email}</p>
      
      {/* Seus formulários aqui */}
      
      <button 
        onClick={handleSave} 
        disabled={loading}
        className="save-button"
      >
        {loading ? 'Salvando...' : 'Salvar Alterações'}
      </button>
    </div>
  );
};

export default ProfileSettings;
```

### 4. Função de Logout e Reautenticação

```typescript
// Função para fazer logout
const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao fazer logout:', error);
    } else {
      console.log('✅ Logout realizado com sucesso');
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Erro no logout:', error);
  }
};

// Função para renovar sessão
const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Erro ao renovar sessão:', error);
      return false;
    }
    console.log('✅ Sessão renovada com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao renovar sessão:', error);
    return false;
  }
};
```

### 5. Interceptor para Requisições HTTP

```typescript
// Função helper para fazer requisições autenticadas
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  try {
    // Verificar se há sessão válida
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.access_token) {
      throw new Error('Sessão inválida ou expirada');
    }
    
    // Adicionar token ao header
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers
    };
    
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Se retornar 401, tentar renovar sessão
    if (response.status === 401) {
      console.log('🔄 Token expirado, tentando renovar...');
      const renewed = await refreshSession();
      
      if (renewed) {
        // Tentar novamente com novo token
        const { data: { session: newSession } } = await supabase.auth.getSession();
        const newHeaders = {
          ...headers,
          'Authorization': `Bearer ${newSession.access_token}`
        };
        
        return await fetch(url, {
          ...options,
          headers: newHeaders
        });
      } else {
        throw new Error('Não foi possível renovar a sessão');
      }
    }
    
    return response;
  } catch (error) {
    console.error('❌ Erro na requisição autenticada:', error);
    throw error;
  }
};
```

## 🔧 Passos para Implementar a Correção

### 1. Verificar Variáveis de Ambiente
```bash
# No arquivo .env do frontend
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 2. Atualizar Função de Atualização
- Substituir o código atual da função `updateUserProfile`
- Adicionar logs detalhados para debug
- Implementar verificações de autenticação

### 3. Adicionar Verificação de Estado
- Implementar `useEffect` para verificar autenticação
- Escutar mudanças no estado de autenticação
- Mostrar tela de login se necessário

### 4. Testar a Correção
```javascript
// Console do navegador - verificar se há erros
console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('Supabase Key:', process.env.REACT_APP_SUPABASE_ANON_KEY?.substring(0, 10) + '...');

// Verificar sessão manualmente
supabase.auth.getSession().then(({ data, error }) => {
  console.log('Sessão atual:', data.session?.user?.email);
  console.log('Token:', data.session?.access_token?.substring(0, 20) + '...');
});
```

## 🚨 Problemas Comuns e Soluções

### Problema 1: Variáveis de ambiente não carregadas
**Solução:** Reiniciar o servidor de desenvolvimento após alterar `.env`

### Problema 2: Token expirado
**Solução:** Implementar renovação automática de token

### Problema 3: Usuário não logado
**Solução:** Redirecionar para tela de login

### Problema 4: CORS no backend
**Solução:** Verificar se o backend aceita requisições do frontend

## ✅ Resultado Esperado

Após implementar as correções:
1. ✅ Verificação de autenticação funcionando
2. ✅ Logs detalhados no console
3. ✅ Tratamento de erros melhorado
4. ✅ Renovação automática de sessão
5. ✅ Redirecionamento para login quando necessário

## 🔍 Debug Adicional

Se o problema persistir, adicione estes logs no console:

```javascript
// Verificar configuração do Supabase
console.log('Supabase configurado:', !!supabase);
console.log('URL:', supabase.supabaseUrl);
console.log('Key:', supabase.supabaseKey?.substring(0, 10));

// Verificar estado atual
supabase.auth.getUser().then(({ data, error }) => {
  console.log('Usuário atual:', data.user?.email || 'Não logado');
  console.log('Erro de usuário:', error?.message || 'Nenhum');
});

supabase.auth.getSession().then(({ data, error }) => {
  console.log('Sessão válida:', !!data.session);
  console.log('Token presente:', !!data.session?.access_token);
  console.log('Erro de sessão:', error?.message || 'Nenhum');
});
```

Com essas correções, o erro "Usuário não autenticado" deve ser resolvido! 🎯

