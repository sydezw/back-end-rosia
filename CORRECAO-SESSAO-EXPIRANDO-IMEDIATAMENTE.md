# Correção - Sessão Expirando Imediatamente Após Login

## 🚨 Problema Identificado

A sessão do Supabase está expirando imediatamente após o login, causando:

```
Sua sessão expirou. Faça login novamente.
Unchecked runtime.lastError: The message port closed before a response was received.
📥 Carregando dados do usuário via backend...
❌ Erro de sessão: null
404 Error: User attempted to access non-existent route: /login
```

### Causas do Problema:
1. **Configuração incorreta do Supabase Client**
2. **Persistência de sessão não configurada**
3. **Rota /login não existe no frontend**
4. **Verificação de sessão inadequada**
5. **Possível conflito entre localStorage e sessionStorage**

## ✅ Solução Completa

### 1. Configuração Correta do Supabase Client

**Arquivo: `config/supabase.js` ou `supabase.ts`**

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsazbeovtmmetpiyokqc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYXpiZW92dG1tZXRwaXlva3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzY5NzEsImV4cCI6MjA1MDU1Mjk3MX0.Ej8nkGJBhn_r7wgmkdmKQBJbJNJhLLJhKQJhKQJhKQJ';

// ✅ CONFIGURAÇÃO CORRETA COM PERSISTÊNCIA DE SESSÃO
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configurar persistência de sessão
    storage: window.localStorage, // Usar localStorage para persistir sessão
    storageKey: 'supabase.auth.token', // Chave personalizada
    autoRefreshToken: true, // Renovar token automaticamente
    persistSession: true, // Manter sessão ativa
    detectSessionInUrl: true, // Detectar sessão na URL (importante para OAuth)
    flowType: 'pkce' // Usar PKCE flow para segurança
  },
  // Configurações globais
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  },
  // Configurações de realtime (opcional)
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
});

// ✅ FUNÇÃO PARA VERIFICAR E RESTAURAR SESSÃO
export const initializeAuth = async () => {
  try {
    console.log('🔍 Inicializando autenticação...');
    
    // Verificar se há sessão salva
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Erro ao obter sessão:', error);
      return { session: null, error };
    }
    
    if (session) {
      console.log('✅ Sessão encontrada:', {
        user: session.user.email,
        expires_at: new Date(session.expires_at * 1000).toLocaleString(),
        access_token: session.access_token ? 'Presente' : 'Ausente'
      });
      
      // Verificar se o token não está expirado
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        console.log('⚠️ Token expirado, tentando renovar...');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ Erro ao renovar sessão:', refreshError);
          return { session: null, error: refreshError };
        }
        
        console.log('✅ Sessão renovada com sucesso');
        return { session: refreshData.session, error: null };
      }
      
      return { session, error: null };
    } else {
      console.log('ℹ️ Nenhuma sessão encontrada');
      return { session: null, error: null };
    }
    
  } catch (error) {
    console.error('❌ Erro na inicialização da auth:', error);
    return { session: null, error };
  }
};

// ✅ LISTENER PARA MUDANÇAS DE AUTENTICAÇÃO
export const setupAuthListener = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('🔄 Mudança de autenticação:', event, session?.user?.email || 'Sem usuário');
      
      switch (event) {
        case 'SIGNED_IN':
          console.log('✅ Usuário logado:', session.user.email);
          break;
        case 'SIGNED_OUT':
          console.log('🚪 Usuário deslogado');
          // Limpar dados locais
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('userEmail');
          break;
        case 'TOKEN_REFRESHED':
          console.log('🔄 Token renovado para:', session.user.email);
          break;
        case 'USER_UPDATED':
          console.log('👤 Usuário atualizado:', session.user.email);
          break;
      }
      
      if (callback) {
        callback(event, session);
      }
    }
  );
  
  return subscription;
};

// ✅ FUNÇÃO PARA LOGOUT SEGURO
export const signOut = async () => {
  try {
    console.log('🚪 Fazendo logout...');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Erro no logout:', error);
      return { success: false, error };
    }
    
    // Limpar dados locais
    localStorage.clear();
    sessionStorage.clear();
    
    console.log('✅ Logout realizado com sucesso');
    return { success: true, error: null };
    
  } catch (error) {
    console.error('❌ Erro inesperado no logout:', error);
    return { success: false, error };
  }
};
```

### 2. Componente ProfileSettings Corrigido

**Arquivo: `ProfileSettings.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { supabase, initializeAuth, setupAuthListener } from './config/supabase';
import { updateUserProfile, getUserProfile } from './profile-api';

const ProfileSettings = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profileData, setProfileData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    data_nascimento: ''
  });
  const [addressData, setAddressData] = useState({
    nome_endereco: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState('');
  const [authSubscription, setAuthSubscription] = useState(null);
  
  useEffect(() => {
    initializeComponent();
    
    // Cleanup na desmontagem
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);
  
  const initializeComponent = async () => {
    try {
      setLoading(true);
      console.log('🔍 Inicializando ProfileSettings...');
      
      // ✅ INICIALIZAR AUTENTICAÇÃO CORRETAMENTE
      const { session: currentSession, error } = await initializeAuth();
      
      if (error) {
        console.error('❌ Erro na inicialização:', error);
        setIsAuthenticated(false);
        setMessage('Erro de autenticação: ' + error.message);
        return;
      }
      
      if (!currentSession?.user) {
        console.log('❌ Usuário não autenticado');
        setIsAuthenticated(false);
        setMessage('Sua sessão expirou. Redirecionando para login...');
        
        // Redirecionar para página de login após 2 segundos
        setTimeout(() => {
          window.location.href = '/auth/login'; // ✅ ROTA CORRETA
        }, 2000);
        return;
      }
      
      console.log('✅ Usuário autenticado:', currentSession.user.email);
      setUser(currentSession.user);
      setSession(currentSession);
      setIsAuthenticated(true);
      
      // ✅ CONFIGURAR LISTENER DE AUTENTICAÇÃO
      const subscription = setupAuthListener((event, newSession) => {
        if (event === 'SIGNED_OUT' || !newSession) {
          console.log('🚪 Usuário deslogado, redirecionando...');
          setIsAuthenticated(false);
          setUser(null);
          setSession(null);
          window.location.href = '/auth/login';
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token renovado, atualizando sessão...');
          setSession(newSession);
        }
      });
      
      setAuthSubscription(subscription);
      
      // Carregar dados do usuário
      await loadUserData();
      
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      setIsAuthenticated(false);
      setMessage('Erro inesperado na inicialização');
    } finally {
      setLoading(false);
    }
  };
  
  const loadUserData = async () => {
    try {
      console.log('📥 Carregando dados do usuário via backend...');
      
      // ✅ VERIFICAR SESSÃO ANTES DE CARREGAR DADOS
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Erro de sessão:', sessionError);
        setMessage('Erro de sessão: ' + sessionError.message);
        return;
      }
      
      if (!currentSession) {
        console.error('❌ Sessão não encontrada');
        setMessage('Sessão expirada. Redirecionando...');
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 2000);
        return;
      }
      
      const result = await getUserProfile();
      
      if (result.success) {
        // Preencher formulários com dados existentes
        if (result.profile) {
          setProfileData({
            nome: result.profile.nome || '',
            cpf: result.profile.cpf || '',
            telefone: result.profile.telefone || '',
            data_nascimento: result.profile.data_nascimento || ''
          });
        }
        
        if (result.address) {
          setAddressData({
            nome_endereco: result.address.nome_endereco || '',
            cep: result.address.cep || '',
            logradouro: result.address.logradouro || '',
            numero: result.address.numero || '',
            bairro: result.address.bairro || '',
            cidade: result.address.cidade || '',
            estado: result.address.estado || '',
            complemento: result.address.complemento || ''
          });
        }
        
        console.log('✅ Dados carregados com sucesso');
      } else {
        console.log('ℹ️ Nenhum dado encontrado, formulários vazios');
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setMessage('Erro ao carregar dados existentes');
    }
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      
      // ✅ VERIFICAR SESSÃO ANTES DE SALVAR
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !currentSession) {
        setMessage('❌ Sessão expirada. Faça login novamente.');
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 2000);
        return;
      }
      
      console.log('💾 Salvando dados...');
      
      const result = await updateUserProfile(profileData, addressData);
      
      if (result.success) {
        setMessage('✅ Dados salvos com sucesso!');
        console.log('✅ Dados salvos:', result);
      } else {
        setMessage('❌ Erro ao salvar: ' + result.error);
        console.error('❌ Erro ao salvar:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Erro no salvamento:', error);
      setMessage('❌ Erro inesperado ao salvar dados');
    } finally {
      setSaving(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      console.log('🚪 Iniciando logout...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Erro no logout:', error);
      }
      
      // Limpar dados locais
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirecionar para login
      window.location.href = '/auth/login';
      
    } catch (error) {
      console.error('Erro no logout:', error);
      window.location.href = '/auth/login';
    }
  };
  
  // ✅ TELA DE LOADING MELHORADA
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <h3>🔍 Verificando autenticação...</h3>
        <p>Aguarde enquanto carregamos suas informações...</p>
      </div>
    );
  }
  
  // ✅ TELA DE LOGIN NECESSÁRIO MELHORADA
  if (!isAuthenticated) {
    return (
      <div className="auth-required">
        <h2>🔐 Acesso Restrito</h2>
        <p>Sua sessão expirou ou você não está logado.</p>
        {message && (
          <div className="error-message">
            {message}
          </div>
        )}
        <button onClick={() => window.location.href = '/auth/login'}>
          🔑 Fazer Login
        </button>
      </div>
    );
  }
  
  // Resto do componente permanece igual...
  return (
    <div className="profile-settings">
      <div className="profile-header">
        <h1>👤 Minhas Informações</h1>
        <div className="user-info">
          <p>📧 {user?.email}</p>
          <p>🕒 Sessão válida até: {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'}</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          🚪 Sair
        </button>
      </div>
      
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      
      {/* Resto dos formulários... */}
      <div className="save-section">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="save-btn"
        >
          {saving ? '💾 Salvando...' : '💾 Salvar Alterações'}
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;
```

### 3. Configuração de Rotas do Frontend

**Arquivo: `App.tsx` ou `Router.tsx`**

```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProfileSettings from './components/ProfileSettings';
import Login from './components/Login';
import NotFound from './components/NotFound';

function App() {
  return (
    <Router>
      <Routes>
        {/* ✅ ROTA DE LOGIN CORRETA */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        
        {/* ✅ ROTA DE PERFIL */}
        <Route path="/profile" element={<ProfileSettings />} />
        <Route path="/minhas-informacoes" element={<Navigate to="/profile" replace />} />
        
        {/* ✅ ROTA INICIAL */}
        <Route path="/" element={<Navigate to="/profile" replace />} />
        
        {/* ✅ ROTA 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
```

### 4. Componente de Login Atualizado

**Arquivo: `Login.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { supabase, initializeAuth } from './config/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  useEffect(() => {
    checkExistingAuth();
  }, []);
  
  const checkExistingAuth = async () => {
    try {
      const { session } = await initializeAuth();
      
      if (session?.user) {
        console.log('✅ Usuário já logado, redirecionando...');
        window.location.href = '/profile';
        return;
      }
      
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
    } finally {
      setCheckingAuth(false);
    }
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setMessage('');
      
      console.log('🔑 Tentando fazer login...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });
      
      if (error) {
        console.error('❌ Erro no login:', error);
        setMessage('Erro no login: ' + error.message);
        return;
      }
      
      if (data.session) {
        console.log('✅ Login realizado com sucesso:', data.user.email);
        
        // Salvar informações locais
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', data.user.email);
        
        setMessage('✅ Login realizado com sucesso! Redirecionando...');
        
        // Redirecionar após 1 segundo
        setTimeout(() => {
          window.location.href = '/profile';
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      setMessage('Erro inesperado no login');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      console.log('🔑 Tentando login com Google...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/profile`
        }
      });
      
      if (error) {
        console.error('❌ Erro no login Google:', error);
        setMessage('Erro no login Google: ' + error.message);
      }
      
    } catch (error) {
      console.error('❌ Erro inesperado no Google:', error);
      setMessage('Erro inesperado no login Google');
    } finally {
      setLoading(false);
    }
  };
  
  if (checkingAuth) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <h3>🔍 Verificando autenticação...</h3>
      </div>
    );
  }
  
  return (
    <div className="login-container">
      <div className="login-form">
        <h1>🔑 Fazer Login</h1>
        
        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Senha:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? '🔄 Entrando...' : '🔑 Entrar'}
          </button>
        </form>
        
        <div className="divider">ou</div>
        
        <button onClick={handleGoogleLogin} disabled={loading} className="google-btn">
          {loading ? '🔄 Conectando...' : '🔑 Entrar com Google'}
        </button>
      </div>
    </div>
  );
};

export default Login;
```

### 5. CSS Adicional

```css
.user-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.user-info p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 6px;
  margin: 10px 0;
  border: 1px solid #f5c6cb;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f8f9fa;
}

.login-form {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

.divider {
  text-align: center;
  margin: 20px 0;
  color: #666;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #ddd;
  z-index: 1;
}

.divider span {
  background: white;
  padding: 0 15px;
  position: relative;
  z-index: 2;
}

.google-btn {
  width: 100%;
  background: #4285f4;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.google-btn:hover:not(:disabled) {
  background: #357ae8;
}
```

## 🧪 Teste da Correção

### 1. Verificar no Console do Navegador

```javascript
// Testar inicialização da autenticação
initializeAuth().then(result => {
  console.log('Resultado da inicialização:', result);
});

// Verificar sessão atual
supabase.auth.getSession().then(({ data, error }) => {
  console.log('Sessão atual:', data.session);
  console.log('Erro:', error);
});

// Testar renovação de token
supabase.auth.refreshSession().then(({ data, error }) => {
  console.log('Renovação:', data);
  console.log('Erro:', error);
});
```

### 2. Verificar LocalStorage

```javascript
// Verificar dados salvos
console.log('Dados no localStorage:');
console.log('supabase.auth.token:', localStorage.getItem('supabase.auth.token'));
console.log('isLoggedIn:', localStorage.getItem('isLoggedIn'));
console.log('userEmail:', localStorage.getItem('userEmail'));
```

## ✅ Checklist de Implementação

### Configuração:
- [ ] Atualizar configuração do Supabase Client
- [ ] Implementar função `initializeAuth()`
- [ ] Configurar listener de autenticação
- [ ] Adicionar função de logout seguro

### Componentes:
- [ ] Atualizar ProfileSettings com verificação de sessão
- [ ] Criar componente Login funcional
- [ ] Configurar rotas corretas no App
- [ ] Adicionar tratamento de erros

### Testes:
- [ ] Testar login e logout
- [ ] Verificar persistência de sessão
- [ ] Testar renovação automática de token
- [ ] Verificar redirecionamentos
- [ ] Confirmar que não há mais erro de sessão expirada

## 🎯 Resultado Esperado

Após implementar essas correções:

1. ✅ Sessão não expira imediatamente após login
2. ✅ Token é renovado automaticamente
3. ✅ Rota `/login` funciona corretamente
4. ✅ Redirecionamentos funcionam adequadamente
5. ✅ Dados são persistidos entre recarregamentos
6. ✅ Logout limpa dados corretamente
7. ✅ Verificação de autenticação robusta

**Agora o sistema manterá a sessão ativa e funcionará corretamente! 🚀**