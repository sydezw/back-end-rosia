# Guia Frontend - Atualização de Perfil Completo

## Novo Endpoint Seguro: `/api/users/profile-update`

### ⚠️ IMPORTANTE: Campo Nome Completo Desbloqueado

**O campo "Nome Completo" nas informações pessoais DEVE ser editável e não pode estar bloqueado/travado no frontend.**

### Endpoint Corrigido

```
PUT /api/users/profile-update
Authorization: Bearer {supabase_access_token}
Content-Type: application/json
```

### Estrutura de Dados

O endpoint aceita dados de **perfil** e **endereço** na mesma requisição:

#### Dados do Perfil (user_profiles)
- `nome` ou `full_name` - Nome completo do usuário
- `cpf` - CPF (apenas números)
- `telefone` ou `phone` - Telefone (10 ou 11 dígitos)
- `data_nascimento` ou `birth_date` - Data de nascimento (formato ISO)

#### Dados do Endereço (user_addresses)
- `nome_endereco` - Nome/apelido do endereço (ex: "Casa", "Trabalho")
- `cep` - CEP (8 dígitos)
- `logradouro` - Rua/Avenida
- `numero` - Número da residência
- `bairro` - Bairro
- `cidade` - Cidade
- `estado` - Estado (sigla ou nome completo)
- `complemento` - Complemento (opcional)

### Exemplo de Implementação

#### 1. Função para Atualizar Perfil

```javascript
const updateUserProfile = async (profileData, addressData = null) => {
  try {
    // Obter token do Supabase (não o JWT customizado)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado');
    }
    
    // Preparar dados da requisição
    const requestData = {};
    
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
    
    const response = await fetch('https://back-end-rosia02.vercel.app/api/users/profile-update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(requestData)
    });
    
    const data = await response.json();
    
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
```

#### 2. Exemplo de Uso - Apenas Perfil

```javascript
const handleSaveProfile = async () => {
  const profileData = {
    nome: 'João Silva Santos',
    cpf: '12345678901',
    telefone: '11987654321',
    data_nascimento: '1990-05-15'
  };
  
  const result = await updateUserProfile(profileData);
  
  if (result.success) {
    alert('Perfil atualizado com sucesso!');
    // Atualizar estado do componente com os novos dados
    setUser(result.user);
  } else {
    alert('Erro ao atualizar perfil: ' + result.error);
  }
};
```

#### 3. Exemplo de Uso - Apenas Endereço

```javascript
const handleSaveAddress = async () => {
  const addressData = {
    nome_endereco: 'Casa',
    cep: '01234567',
    logradouro: 'Rua das Flores',
    numero: '123',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    complemento: 'Apto 45'
  };
  
  const result = await updateUserProfile(null, addressData);
  
  if (result.success) {
    alert('Endereço atualizado com sucesso!');
    setAddress(result.address);
  } else {
    alert('Erro ao atualizar endereço: ' + result.error);
  }
};
```

#### 4. Exemplo de Uso - Perfil + Endereço

```javascript
const handleSaveComplete = async () => {
  const profileData = {
    nome: 'Maria Silva',
    cpf: '98765432100',
    telefone: '11912345678',
    data_nascimento: '1985-12-20'
  };
  
  const addressData = {
    nome_endereco: 'Trabalho',
    cep: '04567890',
    logradouro: 'Av. Paulista',
    numero: '1000',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    estado: 'SP'
  };
  
  const result = await updateUserProfile(profileData, addressData);
  
  if (result.success) {
    alert(`Dados atualizados: ${result.message}`);
    setUser(result.user);
    setAddress(result.address);
  } else {
    alert('Erro: ' + result.error);
  }
};
```

### Componente React Completo

```jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const ProfileSettings = () => {
  const [user, setUser] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Estados dos formulários
  const [profileForm, setProfileForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    data_nascimento: ''
  });
  
  const [addressForm, setAddressForm] = useState({
    nome_endereco: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: ''
  });
  
  // Carregar dados existentes
  useEffect(() => {
    loadUserData();
  }, []);
  
  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Carregar perfil atual
      const response = await fetch('https://back-end-rosia02.vercel.app/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      const data = await response.json();
      if (data.success && data.data.user) {
        const userData = data.data.user;
        setUser(userData);
        setProfileForm({
          nome: userData.full_name || '',
          cpf: userData.cpf || '',
          telefone: userData.phone || '',
          data_nascimento: userData.birth_date || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };
  
  const handleSave = async () => {
    setLoading(true);
    setErrors({});
    
    try {
      const result = await updateUserProfile(profileForm, addressForm);
      
      if (result.success) {
        alert('Dados salvos com sucesso!');
        setUser(result.user);
        setAddress(result.address);
      } else {
        alert('Erro ao salvar: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar dados');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="profile-settings">
      <h2>Minhas Informações</h2>
      
      {/* Seção Informações Pessoais */}
      <div className="section">
        <h3>Informações Pessoais</h3>
        
        <div className="form-group">
          <label>Nome Completo *</label>
          <input
            type="text"
            value={profileForm.nome}
            onChange={(e) => setProfileForm({...profileForm, nome: e.target.value})}
            placeholder="Digite seu nome completo"
            disabled={loading}
            // ⚠️ IMPORTANTE: Campo deve estar DESBLOQUEADO
            readOnly={false}
          />
        </div>
        
        <div className="form-group">
          <label>CPF</label>
          <input
            type="text"
            value={profileForm.cpf}
            onChange={(e) => setProfileForm({...profileForm, cpf: e.target.value})}
            placeholder="000.000.000-00"
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label>Telefone</label>
          <input
            type="text"
            value={profileForm.telefone}
            onChange={(e) => setProfileForm({...profileForm, telefone: e.target.value})}
            placeholder="(11) 99999-9999"
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label>Data de Nascimento</label>
          <input
            type="date"
            value={profileForm.data_nascimento}
            onChange={(e) => setProfileForm({...profileForm, data_nascimento: e.target.value})}
            disabled={loading}
          />
        </div>
      </div>
      
      {/* Seção Endereço */}
      <div className="section">
        <h3>Endereço</h3>
        
        <div className="form-group">
          <label>Nome do Endereço *</label>
          <input
            type="text"
            value={addressForm.nome_endereco}
            onChange={(e) => setAddressForm({...addressForm, nome_endereco: e.target.value})}
            placeholder="Casa, Trabalho, etc."
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label>CEP *</label>
          <input
            type="text"
            value={addressForm.cep}
            onChange={(e) => setAddressForm({...addressForm, cep: e.target.value})}
            placeholder="00000-000"
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label>Logradouro *</label>
          <input
            type="text"
            value={addressForm.logradouro}
            onChange={(e) => setAddressForm({...addressForm, logradouro: e.target.value})}
            placeholder="Rua, Avenida, etc."
            disabled={loading}
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Número *</label>
            <input
              type="text"
              value={addressForm.numero}
              onChange={(e) => setAddressForm({...addressForm, numero: e.target.value})}
              placeholder="123"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Complemento</label>
            <input
              type="text"
              value={addressForm.complemento}
              onChange={(e) => setAddressForm({...addressForm, complemento: e.target.value})}
              placeholder="Apto, Bloco, etc."
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Bairro *</label>
          <input
            type="text"
            value={addressForm.bairro}
            onChange={(e) => setAddressForm({...addressForm, bairro: e.target.value})}
            placeholder="Nome do bairro"
            disabled={loading}
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Cidade *</label>
            <input
              type="text"
              value={addressForm.cidade}
              onChange={(e) => setAddressForm({...addressForm, cidade: e.target.value})}
              placeholder="Nome da cidade"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Estado *</label>
            <input
              type="text"
              value={addressForm.estado}
              onChange={(e) => setAddressForm({...addressForm, estado: e.target.value})}
              placeholder="SP, RJ, MG, etc."
              disabled={loading}
            />
          </div>
        </div>
      </div>
      
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

### Tratamento de Erros

O endpoint retorna erros detalhados para cada campo:

```javascript
const handleApiErrors = (errorResponse) => {
  if (errorResponse.error?.details) {
    const errors = errorResponse.error.details;
    
    // Exibir erros específicos por campo
    Object.keys(errors).forEach(field => {
      const fieldErrors = errors[field];
      console.error(`Erro no campo ${field}:`, fieldErrors.join(', '));
    });
    
    return errors;
  }
  
  return { general: [errorResponse.error?.message || 'Erro desconhecido'] };
};
```

### Validações Frontend (Opcionais)

```javascript
const validateCPF = (cpf) => {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  return cleanCPF.length === 11 && !/^(\d)\1{10}$/.test(cleanCPF);
};

const validateCEP = (cep) => {
  const cleanCEP = cep.replace(/[^\d]/g, '');
  return cleanCEP.length === 8;
};

const validatePhone = (phone) => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};
```

## Resumo das Correções

✅ **Novo endpoint seguro**: `/api/users/profile-update`
✅ **Autenticação robusta**: Usa token do Supabase
✅ **Validações completas**: CPF, telefone, CEP, campos obrigatórios
✅ **Suporte a perfil + endereço**: Atualiza ambas as tabelas
✅ **Tratamento de erros**: Retorna erros detalhados por campo
✅ **Campo nome desbloqueado**: Deve ser editável no frontend

## ⚠️ AÇÃO NECESSÁRIA NO FRONTEND

**DESBLOQUEAR o campo "Nome Completo" nas informações pessoais. Remover qualquer `readOnly={true}`, `disabled={true}` ou CSS que impeça a edição deste campo.**

O usuário deve poder editar seu nome completo livremente! 🔓

