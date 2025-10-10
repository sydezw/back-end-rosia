# 🔄 Guia Frontend: Endpoints Google com Token Supabase

## 📋 Mudança Importante

**ANTES:** Os endpoints usavam token do Google diretamente  
**AGORA:** Os endpoints usam token do Supabase (após login Google)

⚠️ **Não é mais necessário usar token Google diretamente!**

## 🔐 Como Obter o Token Correto

### Método 1: Após Login Google
```javascript
// Após login Google via Supabase
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
});

// Obter sessão atual
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token; // Este é o token que você deve usar!
```

### Método 2: Verificar Sessão Existente
```javascript
// Verificar se usuário já está logado
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  const token = session.access_token;
  // Use este token nos headers
} else {
  // Redirecionar para login
}
```

### Método 3: Listener de Mudanças de Auth
```javascript
let currentToken = null;

supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    currentToken = session.access_token;
    console.log('Token atualizado:', currentToken);
  } else {
    currentToken = null;
    console.log('Usuário deslogado');
  }
});
```

## 🔗 Endpoints Disponíveis

### 1. Atualizar Dados Pessoais
**PUT** `/api/google-users/personal-data`

### 2. Atualizar Endereço
**PUT** `/api/google-users/address`

### 3. Buscar Perfil
**GET** `/api/google-users/profile`

## 💻 Exemplos Práticos

### React/TypeScript - Hook Personalizado

```typescript
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface PersonalData {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  data_nascimento: string;
}

interface Address {
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
}

export const useGoogleUserAPI = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Obter token inicial
    const getInitialToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setToken(session?.access_token || null);
    };

    getInitialToken();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setToken(session?.access_token || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const updatePersonalData = async (data: PersonalData) => {
    if (!token) throw new Error('Token não encontrado. Faça login novamente.');
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3030/api/google-users/personal-data', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar dados pessoais');
      }
      
      return result;
    } finally {
      setLoading(false);
    }
  };

  const updateAddress = async (data: Address) => {
    if (!token) throw new Error('Token não encontrado. Faça login novamente.');
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3030/api/google-users/address', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar endereço');
      }
      
      return result;
    } finally {
      setLoading(false);
    }
  };

  const getProfile = async () => {
    if (!token) throw new Error('Token não encontrado. Faça login novamente.');
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3030/api/google-users/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar perfil');
      }
      
      return result;
    } finally {
      setLoading(false);
    }
  };

  return {
    token,
    loading,
    updatePersonalData,
    updateAddress,
    getProfile,
    isAuthenticated: !!token
  };
};
```

### Componente de Exemplo

```typescript
import React, { useState } from 'react';
import { useGoogleUserAPI } from './useGoogleUserAPI';

const ProfileForm: React.FC = () => {
  const { updatePersonalData, updateAddress, loading, isAuthenticated } = useGoogleUserAPI();
  
  const [personalData, setPersonalData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    data_nascimento: ''
  });

  const [address, setAddress] = useState({
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: ''
  });

  const handlePersonalDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await updatePersonalData(personalData);
      alert('Dados pessoais atualizados com sucesso!');
      console.log('Resultado:', result);
    } catch (error) {
      alert(`Erro: ${error.message}`);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await updateAddress(address);
      alert('Endereço atualizado com sucesso!');
      console.log('Resultado:', result);
    } catch (error) {
      alert(`Erro: ${error.message}`);
    }
  };

  if (!isAuthenticated) {
    return <div>Por favor, faça login com Google primeiro.</div>;
  }

  return (
    <div>
      {/* Formulário de Dados Pessoais */}
      <form onSubmit={handlePersonalDataSubmit}>
        <h2>Dados Pessoais</h2>
        <input
          type="text"
          placeholder="Nome completo"
          value={personalData.nome}
          onChange={(e) => setPersonalData({...personalData, nome: e.target.value})}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={personalData.email}
          onChange={(e) => setPersonalData({...personalData, email: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="CPF"
          value={personalData.cpf}
          onChange={(e) => setPersonalData({...personalData, cpf: e.target.value})}
          required
        />
        <input
          type="tel"
          placeholder="Telefone"
          value={personalData.telefone}
          onChange={(e) => setPersonalData({...personalData, telefone: e.target.value})}
          required
        />
        <input
          type="date"
          value={personalData.data_nascimento}
          onChange={(e) => setPersonalData({...personalData, data_nascimento: e.target.value})}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Dados Pessoais'}
        </button>
      </form>

      {/* Formulário de Endereço */}
      <form onSubmit={handleAddressSubmit}>
        <h2>Endereço</h2>
        <input
          type="text"
          placeholder="CEP"
          value={address.cep}
          onChange={(e) => setAddress({...address, cep: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Logradouro"
          value={address.logradouro}
          onChange={(e) => setAddress({...address, logradouro: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Número"
          value={address.numero}
          onChange={(e) => setAddress({...address, numero: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Bairro"
          value={address.bairro}
          onChange={(e) => setAddress({...address, bairro: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Cidade"
          value={address.cidade}
          onChange={(e) => setAddress({...address, cidade: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Estado (SP, RJ, etc.)"
          value={address.estado}
          onChange={(e) => setAddress({...address, estado: e.target.value})}
          maxLength={2}
          required
        />
        <input
          type="text"
          placeholder="Complemento (opcional)"
          value={address.complemento}
          onChange={(e) => setAddress({...address, complemento: e.target.value})}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Endereço'}
        </button>
      </form>
    </div>
  );
};

export default ProfileForm;
```

### JavaScript Vanilla

```javascript
// Classe para gerenciar API dos usuários Google
class GoogleUserAPI {
  constructor() {
    this.token = null;
    this.baseURL = 'http://localhost:3030/api/google-users';
    this.initToken();
  }

  async initToken() {
    // Obter token do Supabase
    const { data: { session } } = await supabase.auth.getSession();
    this.token = session?.access_token || null;

    // Listener para mudanças de autenticação
    supabase.auth.onAuthStateChange((event, session) => {
      this.token = session?.access_token || null;
    });
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    if (!this.token) {
      throw new Error('Token não encontrado. Faça login novamente.');
    }

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Erro na requisição');
    }

    return result;
  }

  async updatePersonalData(data) {
    return this.makeRequest('/personal-data', 'PUT', data);
  }

  async updateAddress(data) {
    return this.makeRequest('/address', 'PUT', data);
  }

  async getProfile() {
    return this.makeRequest('/profile', 'GET');
  }

  isAuthenticated() {
    return !!this.token;
  }
}

// Uso da classe
const api = new GoogleUserAPI();

// Exemplo de uso
async function atualizarDados() {
  try {
    // Dados pessoais
    const dadosPessoais = {
      nome: 'João Silva Santos',
      email: 'joao.silva@gmail.com',
      cpf: '12345678901',
      telefone: '11999887766',
      data_nascimento: '1990-05-15'
    };

    const resultPersonal = await api.updatePersonalData(dadosPessoais);
    console.log('Dados pessoais atualizados:', resultPersonal);

    // Endereço
    const endereco = {
      cep: '01234-567',
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      complemento: 'Apartamento 45B'
    };

    const resultAddress = await api.updateAddress(endereco);
    console.log('Endereço atualizado:', resultAddress);

  } catch (error) {
    console.error('Erro:', error.message);
    alert(`Erro: ${error.message}`);
  }
}
```

## 🚨 Tratamento de Erros

### Erros Comuns e Soluções

```javascript
try {
  await api.updatePersonalData(data);
} catch (error) {
  switch (error.message) {
    case 'Token não encontrado. Faça login novamente.':
      // Redirecionar para login
      window.location.href = '/login';
      break;
      
    case 'CPF já em uso por outro usuário':
      alert('Este CPF já está cadastrado. Verifique os dados.');
      break;
      
    case 'Campos obrigatórios faltando':
      alert('Preencha todos os campos obrigatórios.');
      break;
      
    default:
      alert(`Erro: ${error.message}`);
  }
}
```

## 🔄 Migração do Sistema Antigo

### Se você estava usando localStorage para token Google:

**ANTES:**
```javascript
// ❌ NÃO FUNCIONA MAIS
const googleToken = localStorage.getItem('google_token');
fetch('/api/google-users/personal-data', {
  headers: {
    'Authorization': `Bearer ${googleToken}`
  }
});
```

**AGORA:**
```javascript
// ✅ FUNCIONA
const { data: { session } } = await supabase.auth.getSession();
const supabaseToken = session?.access_token;

fetch('/api/google-users/personal-data', {
  headers: {
    'Authorization': `Bearer ${supabaseToken}`
  }
});
```

## 📝 Checklist de Implementação

- [ ] ✅ Remover uso de tokens Google diretos
- [ ] ✅ Implementar obtenção de token via Supabase
- [ ] ✅ Adicionar listener de mudanças de autenticação
- [ ] ✅ Implementar tratamento de erros adequado
- [ ] ✅ Testar fluxo completo de login → atualização de dados
- [ ] ✅ Verificar se interceptador HTTP está configurado corretamente

## 🎯 Resumo das Mudanças

1. **Token Source**: Google → Supabase
2. **Obtenção**: `gapi.auth2` → `supabase.auth.getSession()`
3. **Renovação**: Manual → Automática via Supabase
4. **Validação**: Backend valida via Supabase Auth
5. **Segurança**: Melhor controle de sessão e expiração

**🎉 Resultado**: Endpoints funcionam perfeitamente com o sistema de autenticação Supabase já implementado no seu projeto!