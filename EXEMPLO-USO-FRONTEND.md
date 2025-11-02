# 🎯 Exemplos de Uso dos Endpoints de Perfil no Frontend

## 📋 Resumo dos Endpoints Implementados

Todos os endpoints requerem autenticação (token JWT no header `Authorization: Bearer <token>`).

### 🔐 Autenticação Atualizada
```javascript
// GET /auth/me - Agora retorna perfil completo
const response = await fetch('/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
// Retorna:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@email.com",
    "name": "Nome do Usuário"
  },
  "profile": {
    "id": "uuid",
    "email": "user@email.com",
    "full_name": "João Silva",
    "cpf": "123.456.789-00",
    "phone": "(11) 99999-9999",
    "birth_date": "1990-01-15",
    "gender": "masculino",
    "addresses_count": 2,
    "cart_items_count": 3,
    "favorites_count": 5
  }
}
```

## 👤 Gerenciamento de Perfil

### Buscar Perfil Completo
```javascript
const getProfile = async () => {
  const response = await fetch('/profile/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

### Atualizar Dados Pessoais
```javascript
const updateProfile = async (profileData) => {
  const response = await fetch('/profile/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      full_name: "João Silva Santos",
      cpf: "123.456.789-00", // Formato obrigatório
      phone: "(11) 99999-9999",
      birth_date: "1990-01-15", // YYYY-MM-DD
      gender: "masculino", // masculino, feminino, outro, prefiro_nao_dizer
      newsletter_subscription: true,
      sms_notifications: false
    })
  });
  return await response.json();
};
```

## 📍 Gerenciamento de Endereços

### Listar Endereços
```javascript
const getAddresses = async () => {
  const response = await fetch('/profile/addresses', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

### Adicionar Novo Endereço
```javascript
const addAddress = async () => {
  const response = await fetch('/profile/addresses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      label: "Casa", // Opcional
      recipient_name: "João Silva",
      street: "Rua das Flores, 123",
      complement: "Apto 45", // Opcional
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP", // 2 caracteres obrigatório
      zip_code: "01234-567", // Formato obrigatório
      country: "Brasil", // Opcional, padrão Brasil
      is_default: false // Opcional
    })
  });
  return await response.json();
};
```

### Atualizar Endereço
```javascript
const updateAddress = async (addressId, updateData) => {
  const response = await fetch(`/profile/addresses/${addressId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });
  return await response.json();
};
```

### Remover Endereço
```javascript
const deleteAddress = async (addressId) => {
  const response = await fetch(`/profile/addresses/${addressId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

## 🛒 Carrinho Persistente

### Buscar Carrinho
```javascript
const getCart = async () => {
  const response = await fetch('/profile/cart', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  // Retorna:
  {
    "success": true,
    "cart": {
      "items": [
        {
          "id": "uuid",
          "product_id": "uuid",
          "quantity": 2,
          "size": "M",
          "color": "Azul",
          "unit_price": 89.90,
          "total_price": 179.80,
          "product_name": "Vestido Floral",
          "product_image": "https://..."
        }
      ],
      "subtotal": 179.80,
      "items_count": 2
    }
  }
};
```

### Adicionar ao Carrinho
```javascript
const addToCart = async (productId, quantity = 1, size = null, color = null) => {
  const response = await fetch('/profile/cart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      product_id: productId,
      quantity: quantity,
      size: size, // Opcional
      color: color // Opcional
    })
  });
  return await response.json();
};
```

### Atualizar Quantidade no Carrinho
```javascript
const updateCartItem = async (itemId, quantity) => {
  const response = await fetch(`/profile/cart/${itemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ quantity })
  });
  return await response.json();
};
```

### Remover Item do Carrinho
```javascript
const removeFromCart = async (itemId) => {
  const response = await fetch(`/profile/cart/${itemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

### Limpar Carrinho
```javascript
const clearCart = async () => {
  const response = await fetch('/profile/cart', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

## ❤️ Produtos Favoritos

### Listar Favoritos
```javascript
const getFavorites = async () => {
  const response = await fetch('/profile/favorites', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

### Adicionar aos Favoritos
```javascript
const addToFavorites = async (productId) => {
  const response = await fetch('/profile/favorites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ product_id: productId })
  });
  return await response.json();
};
```

### Remover dos Favoritos
```javascript
const removeFromFavorites = async (productId) => {
  const response = await fetch(`/profile/favorites/${productId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

## 🎣 Hook Personalizado para React

```javascript
// hooks/useProfile.js
import { useState, useEffect } from 'react';

export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.profile);
      } else {
        setError('Erro ao carregar perfil');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/profile/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.profile);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile
  };
};
```

## 🛒 Hook para Carrinho

```javascript
// hooks/useCart.js
import { useState, useEffect } from 'react';

export const useCart = () => {
  const [cart, setCart] = useState({ items: [], subtotal: 0, items_count: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/profile/cart', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setCart(data.cart);
      }
    } catch (err) {
      console.error('Erro ao carregar carrinho:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1, size = null, color = null) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/profile/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: productId, quantity, size, color })
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchCart(); // Recarregar carrinho
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/profile/cart/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchCart();
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const removeItem = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/profile/cart/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchCart();
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  return {
    cart,
    loading,
    addToCart,
    updateQuantity,
    removeItem,
    refetch: fetchCart
  };
};
```

## 🔧 Validações no Frontend

```javascript
// utils/validation.js
export const validateCPF = (cpf) => {
  const cpfRegex = /^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$/;
  return cpfRegex.test(cpf);
};

export const validateCEP = (cep) => {
  const cepRegex = /^[0-9]{5}-[0-9]{3}$/;
  return cepRegex.test(cep);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}$/;
  return phoneRegex.test(phone);
};

export const formatCPF = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatCEP = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

export const formatPhone = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(\d{4})-\d+?$/, '$1');
};
```

## 🎯 Exemplo de Componente de Perfil

```jsx
// components/ProfileForm.jsx
import React, { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import { validateCPF, formatCPF, formatPhone } from '../utils/validation';

const ProfileForm = () => {
  const { profile, loading, updateProfile } = useProfile();
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    cpf: profile?.cpf || '',
    phone: profile?.phone || '',
    birth_date: profile?.birth_date || '',
    gender: profile?.gender || '',
    newsletter_subscription: profile?.newsletter_subscription ?? true,
    sms_notifications: profile?.sms_notifications ?? false
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    const newErrors = {};
    if (formData.cpf && !validateCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setSaving(true);
    const result = await updateProfile(formData);
    setSaving(false);
    
    if (result.success) {
      alert('Perfil atualizado com sucesso!');
    } else {
      alert('Erro ao atualizar perfil: ' + result.error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Nome Completo:</label>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) => handleChange('full_name', e.target.value)}
        />
      </div>
      
      <div>
        <label>CPF:</label>
        <input
          type="text"
          value={formData.cpf}
          onChange={(e) => handleChange('cpf', formatCPF(e.target.value))}
          placeholder="000.000.000-00"
        />
        {errors.cpf && <span className="error">{errors.cpf}</span>}
      </div>
      
      <div>
        <label>Telefone:</label>
        <input
          type="text"
          value={formData.phone}
          onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
          placeholder="(11) 99999-9999"
        />
      </div>
      
      <div>
        <label>Data de Nascimento:</label>
        <input
          type="date"
          value={formData.birth_date}
          onChange={(e) => handleChange('birth_date', e.target.value)}
        />
      </div>
      
      <div>
        <label>Gênero:</label>
        <select
          value={formData.gender}
          onChange={(e) => handleChange('gender', e.target.value)}
        >
          <option value="">Selecione</option>
          <option value="masculino">Masculino</option>
          <option value="feminino">Feminino</option>
          <option value="outro">Outro</option>
          <option value="prefiro_nao_dizer">Prefiro não dizer</option>
        </select>
      </div>
      
      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.newsletter_subscription}
            onChange={(e) => handleChange('newsletter_subscription', e.target.checked)}
          />
          Receber newsletter
        </label>
      </div>
      
      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.sms_notifications}
            onChange={(e) => handleChange('sms_notifications', e.target.checked)}
          />
          Receber SMS
        </label>
      </div>
      
      <button type="submit" disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar Perfil'}
      </button>
    </form>
  );
};

export default ProfileForm;
```

## 🔗 URLs Base

**Desenvolvimento:** `http://localhost:3001`  
**Produção:** `https://back-end-rosia.vercel.app`

Todos os endpoints devem ser prefixados com a URL base correspondente ao ambiente.

