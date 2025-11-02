# Correção - Erro 406 "Not Acceptable" nas Requisições Supabase

## 🚨 Problema Identificado

O erro `406 (Not Acceptable)` ocorre quando o frontend tenta fazer requisições diretas para a API REST do Supabase:

```
GET https://nsazbeovtmmetpiyokqc.supabase.co/rest/v1/user_profiles?select=*&email=eq.flutionempresa%40gmail.com 406 (Not Acceptable)
```

### Causa do Problema:
1. **Requisições diretas ao Supabase**: Frontend fazendo GET direto na API REST
2. **Falta de API Key**: Requisições sem header `apikey` necessário
3. **Arquitetura incorreta**: Deveria usar o backend Node.js como intermediário
4. **Rota de login inexistente**: Erro 404 para `/login`

## ✅ Solução: Usar Backend Node.js

### 1. Parar de Fazer Requisições Diretas ao Supabase

**❌ CÓDIGO PROBLEMÁTICO (NÃO USAR):**
```javascript
// Requisição direta ao Supabase - EVITAR
const response = await fetch('https://nsazbeovtmmetpiyokqc.supabase.co/rest/v1/user_profiles?select=*&email=eq.flutionempresa@gmail.com');
```

**✅ CÓDIGO CORRETO:**
```javascript
// Usar o backend Node.js como intermediário
const response = await fetch('https://back-end-rosia02.vercel.app/api/users/profile-update', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(profileData)
});
```

### 2. Função Corrigida para Atualizar Perfil

**Arquivo: `profile-api.ts` ou similar**

```typescript
import { supabase } from './config/supabase';

// ✅ FUNÇÃO CORRIGIDA PARA ATUALIZAR PERFIL
const updateUserProfile = async (profileData: any, addressData: any = null) => {
  try {
    console.log('🔍 Iniciando atualização de perfil...');
    
    // Verificar autenticação local (Supabase Auth)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erro de sessão:', sessionError);
      throw new Error('Erro de autenticação: ' + sessionError.message);
    }
    
    if (!session?.access_token) {
      console.error('❌ Token não encontrado');
      throw new Error('Usuário não autenticado. Faça login novamente.');
    }
    
    console.log('✅ Token obtido, enviando para backend...');
    
    // Preparar dados para envio
    const requestData: any = {};
    
    // Dados do perfil
    if (profileData) {
      if (profileData.nome) requestData.nome = profileData.nome;
      if (profileData.cpf) requestData.cpf = profileData.cpf;
      if (profileData.telefone) requestData.telefone = profileData.telefone;
      if (profileData.data_nascimento) requestData.data_nascimento = profileData.data_nascimento;
    }
    
    // Dados do endereço
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
    
    console.log('📤 Enviando dados:', requestData);
    
    // ✅ REQUISIÇÃO PARA O BACKEND NODE.JS (NÃO DIRETAMENTE AO SUPABASE)
    const response = await fetch('https://back-end-rosia02.vercel.app/api/users/profile-update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro do servidor:', errorData);
      throw new Error(`Erro ${response.status}: ${errorData.error?.message || 'Erro desconhecido'}`);
    }
    
    const data = await response.json();
    console.log('✅ Resposta do servidor:', data);
    
    if (data.success) {
      return {
        success: true,
        user: data.data?.user,
        address: data.data?.address,
        message: data.message || 'Dados atualizados com sucesso!'
      };
    } else {
      throw new Error(data.error?.message || 'Erro na atualização');
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ✅ FUNÇÃO PARA BUSCAR DADOS DO PERFIL
const getUserProfile = async () => {
  try {
    console.log('🔍 Buscando dados do perfil...');
    
    // Verificar autenticação
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      throw new Error('Usuário não autenticado');
    }
    
    // ✅ BUSCAR DADOS VIA BACKEND (NÃO DIRETAMENTE DO SUPABASE)
    const response = await fetch('https://back-end-rosia02.vercel.app/api/users/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ${response.status}: ${errorData.error?.message || 'Erro ao buscar dados'}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        profile: data.data?.profile,
        address: data.data?.address
      };
    } else {
      throw new Error(data.error?.message || 'Erro ao buscar dados');
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar perfil:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export { updateUserProfile, getUserProfile };
```

### 3. Componente React Corrigido

**Arquivo: `ProfileSettings.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabase';
import { updateUserProfile, getUserProfile } from './profile-api';

const ProfileSettings = () => {
  const [user, setUser] = useState(null);
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    initializeComponent();
  }, []);
  
  const initializeComponent = async () => {
    try {
      setLoading(true);
      
      // Verificar autenticação
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        console.log('❌ Usuário não autenticado');
        setIsAuthenticated(false);
        return;
      }
      
      console.log('✅ Usuário autenticado:', session.user.email);
      setUser(session.user);
      setIsAuthenticated(true);
      
      // Carregar dados existentes
      await loadUserData();
      
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };
  
  const loadUserData = async () => {
    try {
      console.log('📥 Carregando dados do usuário...');
      
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erro no logout:', error);
      }
      
      // Limpar dados locais
      localStorage.clear();
      
      // Redirecionar para login
      window.location.href = '/auth/login';
      
    } catch (error) {
      console.error('Erro no logout:', error);
      window.location.href = '/auth/login';
    }
  };
  
  // Tela de loading
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <h3>Carregando suas informações...</h3>
      </div>
    );
  }
  
  // Tela de login necessário
  if (!isAuthenticated) {
    return (
      <div className="auth-required">
        <h2>🔐 Acesso Restrito</h2>
        <p>Você precisa estar logado para acessar suas informações.</p>
        <button onClick={() => window.location.href = '/auth/login'}>
          🔑 Fazer Login
        </button>
      </div>
    );
  }
  
  // Tela principal
  return (
    <div className="profile-settings">
      <div className="profile-header">
        <h1>👤 Minhas Informações</h1>
        <p>Usuário: {user?.email}</p>
        <button onClick={handleLogout} className="logout-btn">
          🚪 Sair
        </button>
      </div>
      
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      
      <div className="forms-container">
        {/* Formulário de Dados Pessoais */}
        <div className="form-section">
          <h3>📋 Dados Pessoais</h3>
          <div className="form-group">
            <label>Nome Completo:</label>
            <input
              type="text"
              value={profileData.nome}
              onChange={(e) => setProfileData({...profileData, nome: e.target.value})}
              placeholder="Seu nome completo"
            />
          </div>
          <div className="form-group">
            <label>CPF:</label>
            <input
              type="text"
              value={profileData.cpf}
              onChange={(e) => setProfileData({...profileData, cpf: e.target.value})}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="form-group">
            <label>Telefone:</label>
            <input
              type="text"
              value={profileData.telefone}
              onChange={(e) => setProfileData({...profileData, telefone: e.target.value})}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div className="form-group">
            <label>Data de Nascimento:</label>
            <input
              type="date"
              value={profileData.data_nascimento}
              onChange={(e) => setProfileData({...profileData, data_nascimento: e.target.value})}
            />
          </div>
        </div>
        
        {/* Formulário de Endereço */}
        <div className="form-section">
          <h3>🏠 Endereço</h3>
          <div className="form-group">
            <label>Nome do Endereço:</label>
            <input
              type="text"
              value={addressData.nome_endereco}
              onChange={(e) => setAddressData({...addressData, nome_endereco: e.target.value})}
              placeholder="Casa, Trabalho, etc."
            />
          </div>
          <div className="form-group">
            <label>CEP:</label>
            <input
              type="text"
              value={addressData.cep}
              onChange={(e) => setAddressData({...addressData, cep: e.target.value})}
              placeholder="00000-000"
            />
          </div>
          <div className="form-group">
            <label>Logradouro:</label>
            <input
              type="text"
              value={addressData.logradouro}
              onChange={(e) => setAddressData({...addressData, logradouro: e.target.value})}
              placeholder="Rua, Avenida, etc."
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Número:</label>
              <input
                type="text"
                value={addressData.numero}
                onChange={(e) => setAddressData({...addressData, numero: e.target.value})}
                placeholder="123"
              />
            </div>
            <div className="form-group">
              <label>Bairro:</label>
              <input
                type="text"
                value={addressData.bairro}
                onChange={(e) => setAddressData({...addressData, bairro: e.target.value})}
                placeholder="Nome do bairro"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Cidade:</label>
              <input
                type="text"
                value={addressData.cidade}
                onChange={(e) => setAddressData({...addressData, cidade: e.target.value})}
                placeholder="Nome da cidade"
              />
            </div>
            <div className="form-group">
              <label>Estado:</label>
              <select
                value={addressData.estado}
                onChange={(e) => setAddressData({...addressData, estado: e.target.value})}
              >
                <option value="">Selecione</option>
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
                {/* Adicionar outros estados */}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Complemento:</label>
            <input
              type="text"
              value={addressData.complemento}
              onChange={(e) => setAddressData({...addressData, complemento: e.target.value})}
              placeholder="Apartamento, bloco, etc. (opcional)"
            />
          </div>
        </div>
      </div>
      
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

### 4. Verificar Endpoint do Backend

**Verificar se existe: `routes/users.js` ou `routes/profile.js`**

```javascript
// Endpoint GET para buscar dados do perfil
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar dados do perfil
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Buscar dados do endereço
    const { data: address, error: addressError } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    res.json({
      success: true,
      data: {
        profile: profile || null,
        address: address || null
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    });
  }
});
```

### 5. CSS para os Formulários

```css
.profile-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.logout-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.message {
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  text-align: center;
  font-weight: bold;
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.forms-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

@media (max-width: 768px) {
  .forms-container {
    grid-template-columns: 1fr;
  }
}

.form-section {
  background: #fff;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.form-section h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
}

.save-section {
  text-align: center;
}

.save-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 15px 40px;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #218838;
}

.save-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.auth-required {
  text-align: center;
  padding: 50px 20px;
}

.auth-required button {
  background: #007bff;
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 20px;
}
```

## 🧪 Teste da Correção

### 1. Verificar no Console do Navegador

```javascript
// Verificar se não há mais requisições diretas ao Supabase
// Abrir DevTools → Network → Filtrar por "supabase.co"
// Deve mostrar apenas requisições de autenticação, não de dados

// Verificar requisições para o backend
// Filtrar por "https://back-end-rosia02.vercel.app" - deve mostrar as requisições corretas

console.log('🔍 Testando funções de perfil...');

// Testar função de busca
getUserProfile().then(result => {
  console.log('Resultado da busca:', result);
});

// Testar função de atualização
const testData = {
  nome: 'Teste Usuario',
  telefone: '11999999999'
};

updateUserProfile(testData).then(result => {
  console.log('Resultado da atualização:', result);
});
```

### 2. Verificar Logs do Backend

No terminal onde o backend está rodando, deve aparecer:
```
PUT /api/users/profile-update
GET /api/users/profile
```

## ✅ Checklist de Implementação

### Frontend:
- [ ] Remover todas as requisições diretas ao Supabase REST API
- [ ] Implementar funções que usam o backend Node.js
- [ ] Atualizar componente ProfileSettings
- [ ] Configurar formulários de perfil e endereço
- [ ] Adicionar tratamento de erros e loading states

### Backend:
- [ ] Verificar se endpoint GET `/api/users/profile` existe
- [ ] Verificar se endpoint PUT `/api/users/profile-update` funciona
- [ ] Testar autenticação com token
- [ ] Verificar logs de requisições

### Testes:
- [ ] Testar salvamento de dados pessoais
- [ ] Testar salvamento de endereço
- [ ] Verificar carregamento de dados existentes
- [ ] Testar tratamento de erros
- [ ] Verificar que não há mais erro 406

## 🎯 Resultado Esperado

Após implementar essas correções:

1. ✅ Não mais erro 406 "Not Acceptable"
2. ✅ Requisições passam pelo backend Node.js
3. ✅ Dados são salvos corretamente no banco
4. ✅ Formulários carregam dados existentes
5. ✅ Autenticação funciona via Supabase Auth
6. ✅ Interface amigável com feedback ao usuário
7. ✅ Arquitetura correta: Frontend → Backend → Supabase

**Agora o sistema funcionará corretamente sem tentar acessar diretamente a API REST do Supabase! 🚀**

