import React, { useState } from 'react';
import { useLogin } from './useLogin';
import { useRegister } from './useRegister';
import { useSocialLogin } from './useSocialLogin';

export default function AuthExample() {
  const { login, loading: loginLoading, error: loginError } = useLogin();
  const { register, loading: registerLoading, error: registerError } = useRegister();
  const { socialLogin, initiateGoogleLogin, initiateFacebookLogin, loading: socialLoading, error: socialError } = useSocialLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    try {
      const data = await login(email, password);
      setMessage(`Login realizado com sucesso! Usuário: ${data.user.name}`);
      console.log('Login normal:', data);
    } catch (error) {
      setMessage(`Erro no login: ${error}`);
    }
  };

  const handleRegister = async () => {
    try {
      const data = await register({ name, email, password });
      setMessage(`Registro realizado com sucesso! Usuário: ${data.user.name}`);
      console.log('Registro:', data);
    } catch (error) {
      setMessage(`Erro no registro: ${error}`);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await initiateGoogleLogin();
      setMessage('Login Google iniciado com sucesso!');
    } catch (error) {
      setMessage(`Erro no login Google: ${error}`);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await initiateFacebookLogin();
      setMessage('Login Facebook iniciado com sucesso!');
    } catch (error) {
      setMessage(`Erro no login Facebook: ${error}`);
    }
  };

  const isLoading = loginLoading || registerLoading || socialLoading;
  const currentError = loginError || registerError || socialError;

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>🌹 Teste de Autenticação - Rosita</h2>
      
      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          backgroundColor: message.includes('Erro') ? '#ffebee' : '#e8f5e8',
          color: message.includes('Erro') ? '#c62828' : '#2e7d32',
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <input 
          placeholder="Nome" 
          value={name} 
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
        />
        <input 
          placeholder="Email" 
          type="email"
          value={email} 
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
        />
        <input 
          type="password" 
          placeholder="Senha" 
          value={password} 
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={handleLogin}
          disabled={isLoading || !email || !password}
          style={{
            padding: '10px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading || !email || !password ? 0.6 : 1
          }}
        >
          {isLoading ? 'Carregando...' : 'Login'}
        </button>
        
        <button 
          onClick={handleRegister}
          disabled={isLoading || !name || !email || !password}
          style={{
            padding: '10px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading || !name || !email || !password ? 0.6 : 1
          }}
        >
          {isLoading ? 'Carregando...' : 'Registrar'}
        </button>
        
        <button 
          onClick={handleGoogleLogin}
          disabled={isLoading}
          style={{
            padding: '10px',
            backgroundColor: '#db4437',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? 'Carregando...' : 'Login com Google'}
        </button>
        
        <button 
          onClick={handleFacebookLogin}
          disabled={isLoading}
          style={{
            padding: '10px',
            backgroundColor: '#3b5998',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? 'Carregando...' : 'Login com Facebook'}
        </button>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p><strong>📝 Instruções para teste:</strong></p>
        <ol>
          <li>Configure a URL do backend no arquivo api.ts</li>
          <li>Certifique-se que o backend está rodando</li>
          <li>Preencha os campos e teste as funcionalidades</li>
          <li>Verifique o console do navegador para logs</li>
          <li>Remova este componente após os testes</li>
        </ol>
      </div>
    </div>
  );
}

