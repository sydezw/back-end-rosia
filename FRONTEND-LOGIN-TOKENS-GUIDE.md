# Guia de Integração Frontend - Sistema de Login e Tokens

## 📋 Visão Geral

Este guia documenta as melhorias implementadas no sistema de autenticação, incluindo validação robusta de tokens, utilitário de limpeza de localStorage e novos endpoints de debug.

## 🔧 Novas Funcionalidades Implementadas

### 1. Validação Robusta de Tokens JWT
- Prevenção de tokens "undefined" no localStorage
- Sanitização automática de tokens no backend
- Validação completa de formato e estrutura JWT
- Detecção de tokens corrompidos ou inválidos

### 2. Utilitário de Limpeza de localStorage
- Remoção automática de dados corrompidos
- Validação de tokens existentes
- Limpeza programática de dados de autenticação

### 3. Endpoints de Debug
- `/api/auth/debug/cleanup-tokens` - Limpeza de tokens
- `/api/auth/utils/localStorage-cleanup.js` - Utilitário JavaScript

## 🚀 Como Usar no Frontend

### 1. Implementar Validação de Tokens

```javascript
// Função para validar token antes de salvar
function validateAndSaveToken(token) {
  // Verificar se o token não é undefined, null ou string "undefined"
  if (!token || token === 'undefined' || token === 'null') {
    console.warn('Token inválido detectado:', token);
    return false;
  }
  
  // Verificar formato JWT básico (3 partes separadas por pontos)
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.warn('Formato de token JWT inválido');
    return false;
  }
  
  // Salvar no localStorage apenas se válido
  localStorage.setItem('token', token);
  return true;
}
```

### 2. Usar o Utilitário de Limpeza

```javascript
// Carregar o utilitário do backend
async function loadCleanupUtility() {
  try {
    const response = await fetch('/api/auth/utils/localStorage-cleanup.js');
    const scriptContent = await response.text();
    
    // Executar o script
    const script = document.createElement('script');
    script.textContent = scriptContent;
    document.head.appendChild(script);
    
    return true;
  } catch (error) {
    console.error('Erro ao carregar utilitário de limpeza:', error);
    return false;
  }
}

// Usar as funções de limpeza
async function initializeAuth() {
  await loadCleanupUtility();
  
  // Limpar tokens corrompidos
  if (window.LocalStorageCleanup) {
    window.LocalStorageCleanup.cleanupTokens();
    
    // Configurar limpeza automática (opcional)
    window.LocalStorageCleanup.setupAutoCleanup({
      interval: 300000, // 5 minutos
      onCleanup: (removedItems) => {
        console.log('Tokens limpos automaticamente:', removedItems);
      }
    });
  }
}
```

### 3. Melhorar o Fluxo de Login Google

```javascript
// Função melhorada para login Google
async function handleGoogleLogin(googleToken) {
  try {
    const response = await fetch('/api/auth/login/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: googleToken })
    });
    
    const data = await response.json();
    
    if (data.success && data.token) {
      // Usar validação antes de salvar
      if (validateAndSaveToken(data.token)) {
        console.log('Login realizado com sucesso');
        // Redirecionar ou atualizar UI
        window.location.href = '/dashboard';
      } else {
        throw new Error('Token recebido é inválido');
      }
    } else {
      throw new Error(data.message || 'Erro no login');
    }
  } catch (error) {
    console.error('Erro no login Google:', error);
    // Limpar dados corrompidos em caso de erro
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}
```

### 4. Verificação de Token ao Inicializar App

```javascript
// Verificar token ao carregar a aplicação
async function initializeApp() {
  const token = localStorage.getItem('token');
  
  if (!token || token === 'undefined' || token === 'null') {
    console.log('Nenhum token válido encontrado');
    redirectToLogin();
    return;
  }
  
  // Verificar token com o backend
  try {
    const response = await fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Token inválido');
    }
    
    const userData = await response.json();
    console.log('Usuário autenticado:', userData);
    
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    // Limpar dados inválidos
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    redirectToLogin();
  }
}
```

## 🔍 Endpoints de Debug Disponíveis

### 1. Limpeza de Tokens
```javascript
// GET /api/auth/debug/cleanup-tokens
fetch('/api/auth/debug/cleanup-tokens')
  .then(response => response.json())
  .then(data => {
    console.log('Resultado da limpeza:', data);
  });
```

### 2. Utilitário JavaScript
```javascript
// GET /api/auth/utils/localStorage-cleanup.js
// Retorna o código JavaScript do utilitário de limpeza
```

## ⚠️ Problemas Comuns e Soluções

### 1. Token "undefined" no localStorage
**Problema**: Token salvo como string "undefined"
**Solução**: Usar a função `validateAndSaveToken()` antes de salvar

### 2. Erro 401 em requisições autenticadas
**Problema**: Token corrompido ou expirado
**Solução**: Implementar verificação automática e limpeza

### 3. Login Google retornando erro
**Problema**: Token Google inválido ou expirado
**Solução**: Verificar configuração OAuth e validar token antes do envio

## 📝 Checklist de Implementação

- [ ] Implementar validação de token antes de salvar no localStorage
- [ ] Carregar e configurar o utilitário de limpeza
- [ ] Atualizar fluxo de login Google com validações
- [ ] Adicionar verificação de token na inicialização do app
- [ ] Implementar tratamento de erros para tokens inválidos
- [ ] Configurar limpeza automática (opcional)
- [ ] Testar cenários de token corrompido
- [ ] Verificar funcionamento em diferentes navegadores

## 🔗 Recursos Adicionais

- **Middleware de Autenticação**: Validação robusta no backend
- **Logs Estruturados**: Informações detalhadas de debug
- **Sanitização Automática**: Prevenção de tokens corrompidos
- **Compatibilidade**: Suporte a Node.js e navegadores

## 📞 Suporte

Em caso de problemas:
1. Verificar logs do console do navegador
2. Testar endpoints de debug
3. Limpar localStorage manualmente se necessário
4. Verificar configuração de CORS e headers

---

**Última atualização**: Janeiro 2025
**Versão do Backend**: Compatível com as correções de tokens implementadas

