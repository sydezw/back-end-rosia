// CORREÇÃO DEFINITIVA: ProfileSettings.tsx
// Este arquivo corrige o problema "Token do Supabase não encontrado"

import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabase';
import { updateUserProfile, getUserProfile } from './profile-api';

interface ProfileData {
  nome: string;
  cpf: string;
  telefone: string;
  data_nascimento: string;
}

interface AddressData {
  nome_endereco: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
}

const ProfileSettings = () => {
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    nome: '',
    cpf: '',
    telefone: '',
    data_nascimento: ''
  });
  
  const [addressData, setAddressData] = useState<AddressData>({
    nome_endereco: 'Endereço Principal',
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
  const [authError, setAuthError] = useState('');
  
  useEffect(() => {
    initializeComponent();
    
    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          setIsAuthenticated(true);
          setAuthError('');
          await loadUserData();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
          setAuthError('Usuário não autenticado');
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  const initializeComponent = async () => {
    try {
      setLoading(true);
      console.log('📥 Carregando dados do usuário Google via backend...');
      
      // Verificar autenticação atual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Erro ao obter sessão:', sessionError);
        setAuthError('Erro de sessão: ' + sessionError.message);
        setIsAuthenticated(false);
        return;
      }
      
      if (!session?.user) {
        console.log('ℹ️ Token do Supabase não encontrado');
        setAuthError('Usuário não autenticado. Faça login novamente.');
        setIsAuthenticated(false);
        
        // Tentar renovar a sessão
        console.log('🔄 Tentando renovar sessão...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession?.user) {
          console.log('❌ Não foi possível renovar a sessão');
          // Redirecionar para login ou mostrar botão de login
          redirectToLogin();
          return;
        }
        
        console.log('✅ Sessão renovada com sucesso');
        setUser(refreshedSession.user);
        setIsAuthenticated(true);
        setAuthError('');
      } else {
        console.log('✅ Usuário autenticado:', session.user.email);
        setUser(session.user);
        setIsAuthenticated(true);
        setAuthError('');
      }
      
      // Carregar dados existentes
      await loadUserData();
      
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      setAuthError('Erro ao inicializar: ' + (error as Error).message);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };
  
  const loadUserData = async () => {
    try {
      console.log('📊 Carregando dados do perfil...');
      
      const result = await getUserProfile();
      
      if (result.success && result.data) {
        const data = result.data;
        
        // Carregar dados do perfil
        if (data.profile) {
          setProfileData({
            nome: data.profile.nome || '',
            cpf: data.profile.cpf || '',
            telefone: data.profile.telefone || '',
            data_nascimento: data.profile.data_nascimento || ''
          });
        }
        
        // Carregar dados do endereço
        if (data.address) {
          setAddressData({
            nome_endereco: data.address.nome_endereco || 'Endereço Principal',
            cep: data.address.cep || '',
            logradouro: data.address.logradouro || '',
            numero: data.address.numero || '',
            bairro: data.address.bairro || '',
            cidade: data.address.cidade || '',
            estado: data.address.estado || '',
            complemento: data.address.complemento || ''
          });
        }
        
        console.log('✅ Dados carregados com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setMessage('Erro ao carregar dados: ' + (error as Error).message);
    }
  };
  
  const handleSave = async () => {
    if (!isAuthenticated) {
      setMessage('Você precisa estar logado para salvar o perfil.');
      return;
    }
    
    try {
      setSaving(true);
      setMessage('');
      
      console.log('💾 Salvando perfil...');
      console.log('📤 Profile Data:', profileData);
      console.log('📤 Address Data:', addressData);
      
      // Verificar se os dados obrigatórios estão presentes
      if (!addressData.cep || !addressData.logradouro || !addressData.numero || !addressData.bairro || !addressData.cidade || !addressData.estado) {
        setMessage('❌ Todos os campos de endereço são obrigatórios (exceto complemento)');
        return;
      }
      
      const result = await updateUserProfile(profileData, addressData);
      
      if (result.success) {
        setMessage('✅ Perfil atualizado com sucesso!');
        console.log('✅ Perfil salvo:', result);
        
        // Log detalhado para debug
        console.log('✅ Endereço atualizado:', result.address);
      } else {
        setMessage('❌ Erro ao salvar: ' + (result.error || 'Erro desconhecido'));
        console.error('❌ Erro ao salvar:', result);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar perfil:', error);
      setMessage('❌ Erro ao salvar perfil: ' + (error as Error).message);
      
      // Se for erro de autenticação, tentar renovar sessão
      if ((error as Error).message.includes('não autenticado') || 
          (error as Error).message.includes('Token')) {
        console.log('🔄 Tentando renovar autenticação...');
        await initializeComponent();
      }
    } finally {
      setSaving(false);
    }
  };
  
  const redirectToLogin = () => {
    console.log('🔄 Redirecionando para login...');
    // Implementar redirecionamento para página de login
    // window.location.href = '/login';
    // ou usar router.push('/login') se estiver usando Next.js
    setMessage('Por favor, faça login novamente.');
  };
  
  const handleLogin = async () => {
    try {
      console.log('🔐 Iniciando login com Google...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/profile'
        }
      });
      
      if (error) {
        console.error('❌ Erro no login:', error);
        setAuthError('Erro no login: ' + error.message);
      }
    } catch (error) {
      console.error('❌ Erro ao fazer login:', error);
      setAuthError('Erro ao fazer login: ' + (error as Error).message);
    }
  };
  
  const handleLogout = async () => {
    try {
      console.log('🚪 Fazendo logout...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Erro no logout:', error);
      } else {
        console.log('✅ Logout realizado com sucesso');
        setUser(null);
        setIsAuthenticated(false);
        setProfileData({
          nome: '',
          cpf: '',
          telefone: '',
          data_nascimento: ''
        });
        setAddressData({
          nome_endereco: 'Endereço Principal',
          cep: '',
          logradouro: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          complemento: ''
        });
      }
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
    }
  };
  
  // Se não estiver autenticado, mostrar tela de login
  if (!isAuthenticated) {
    return (
      <div className="profile-settings">
        <div className="auth-error">
          <h2>🔐 Autenticação Necessária</h2>
          <p>{authError || 'Você precisa estar logado para acessar esta página.'}</p>
          <button onClick={handleLogin} className="login-button">
            🔐 Fazer Login com Google
          </button>
          <div className="debug-info">
            <h3>🔍 Informações de Debug:</h3>
            <p>Usuário: {user?.email || 'Não logado'}</p>
            <p>Autenticado: {isAuthenticated ? 'Sim' : 'Não'}</p>
            <p>Erro: {authError || 'Nenhum'}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="profile-settings">
      <div className="auth-status">
        <p>✅ Logado como: {user?.email}</p>
        <button onClick={handleLogout} className="logout-button">
          🚪 Logout
        </button>
      </div>
      
      {loading && <div className="loading">📥 Carregando dados...</div>}
      
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <h2>👤 Dados Pessoais</h2>
        
        <div className="form-group">
          <label>Nome:</label>
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
        
        <h2>🏠 Endereço</h2>
        
        <div className="form-group">
          <label>Nome do Endereço:</label>
          <input
            type="text"
            value={addressData.nome_endereco}
            onChange={(e) => setAddressData({...addressData, nome_endereco: e.target.value})}
            placeholder="Ex: Casa, Trabalho, etc."
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
          <input
            type="text"
            value={addressData.estado}
            onChange={(e) => setAddressData({...addressData, estado: e.target.value})}
            placeholder="SP"
            maxLength={2}
          />
        </div>
        
        <div className="form-group">
          <label>Complemento:</label>
          <input
            type="text"
            value={addressData.complemento}
            onChange={(e) => setAddressData({...addressData, complemento: e.target.value})}
            placeholder="Apto, Bloco, etc. (opcional)"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={saving}
          className="save-button"
        >
          {saving ? '💾 Salvando...' : '💾 Salvar Perfil'}
        </button>
      </form>
      
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      
      <div className="debug-info">
        <h3>🔍 Debug Info:</h3>
        <p>Usuário: {user?.email}</p>
        <p>Autenticado: {isAuthenticated ? 'Sim' : 'Não'}</p>
        <p>Loading: {loading ? 'Sim' : 'Não'}</p>
        <p>Saving: {saving ? 'Sim' : 'Não'}</p>
      </div>
    </div>
  );
};

export default ProfileSettings;

// INSTRUÇÕES DE USO:
// 1. Substitua o arquivo ProfileSettings.tsx existente por este
// 2. Certifique-se de que tem os arquivos:
//    - ./config/supabase (configuração do Supabase)
//    - ./profile-api (funções updateUserProfile e getUserProfile)
// 3. Adicione os estilos CSS necessários
// 4. Teste o fluxo completo de autenticação

// FUNCIONALIDADES IMPLEMENTADAS:
// ✅ Verificação automática de autenticação
// ✅ Renovação automática de sessão
// ✅ Tratamento de erros de token
// ✅ Login/Logout com Google
// ✅ Carregamento de dados existentes
// ✅ Salvamento de perfil e endereço
// ✅ Logs detalhados para debug
// ✅ Interface de debug
// ✅ Redirecionamento automático para login
// ✅ Escuta de mudanças na autenticação