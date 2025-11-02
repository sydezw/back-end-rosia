import { useState } from 'react';
import api from './api';

interface SocialLoginResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    provider: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

type SocialProvider = 'google' | 'facebook';

export function useSocialLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socialLogin = async (provider: SocialProvider, token: string): Promise<SocialLoginResponse> => {
    setLoading(true);
    setError(null);

    try {
      if (!token) {
        throw new Error(`Token do ${provider} é obrigatório`);
      }

      const { data } = await api.post<SocialLoginResponse>(`/auth/login/${provider}`, {
        token
      });

      // Salvar tokens no localStorage
      localStorage.setItem('access_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      return data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || `Erro no login ${provider}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Função para iniciar login com Google (usando Google OAuth)
  const initiateGoogleLogin = async (): Promise<void> => {
    try {
      // Em um cenário real, você usaria a biblioteca do Google OAuth
      // Exemplo com @google-cloud/oauth2:
      
      console.log('🔄 Iniciando login com Google...');
      console.log('📝 Para implementar completamente:');
      console.log('1. Instale: npm install @google-cloud/oauth2');
      console.log('2. Configure as credenciais no Google Console');
      console.log('3. Implemente o fluxo OAuth completo');
      
      // Simulação para teste
      const mockGoogleToken = 'mock_google_token_' + Date.now();
      console.log('🧪 Usando token simulado para teste:', mockGoogleToken);
      
      // Em produção, substitua por:
      // const googleAuth = new GoogleAuth({ ... });
      // const token = await googleAuth.getAccessToken();
      
      await socialLogin('google', mockGoogleToken);
    } catch (error) {
      console.error('Erro no login Google:', error);
      throw error;
    }
  };

  // Função para iniciar login com Facebook (usando Facebook SDK)
  const initiateFacebookLogin = async (): Promise<void> => {
    try {
      console.log('🔄 Iniciando login com Facebook...');
      console.log('📝 Para implementar completamente:');
      console.log('1. Instale: npm install react-facebook-login');
      console.log('2. Configure o App ID no Facebook Developers');
      console.log('3. Implemente o componente FacebookLogin');
      
      // Simulação para teste
      const mockFacebookToken = 'mock_facebook_token_' + Date.now();
      console.log('🧪 Usando token simulado para teste:', mockFacebookToken);
      
      // Em produção, substitua por:
      // window.FB.login((response) => {
      //   if (response.authResponse) {
      //     const token = response.authResponse.accessToken;
      //     socialLogin('facebook', token);
      //   }
      // });
      
      await socialLogin('facebook', mockFacebookToken);
    } catch (error) {
      console.error('Erro no login Facebook:', error);
      throw error;
    }
  };

  return {
    socialLogin,
    initiateGoogleLogin,
    initiateFacebookLogin,
    loading,
    error
  };
}

// Exemplo de implementação completa com Google OAuth
/*
// Para usar o Google OAuth real, instale:
// npm install @google-cloud/oauth2

import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client({
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  clientSecret: process.env.REACT_APP_GOOGLE_CLIENT_SECRET,
  redirectUri: 'https://www.rosia.com.br/auth/google/callback'
});

export async function getGoogleAuthUrl(): Promise<string> {
  const scopes = ['email', 'profile'];
  return googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });
}

export async function handleGoogleCallback(code: string): Promise<string> {
  const { tokens } = await googleClient.getToken(code);
  return tokens.access_token!;
}
*/

// Exemplo de implementação com Facebook SDK
/*
// Para usar o Facebook SDK real, instale:
// npm install react-facebook-login

import FacebookLogin from 'react-facebook-login';

function FacebookLoginButton() {
  const { socialLogin } = useSocialLogin();

  const responseFacebook = async (response: any) => {
    if (response.accessToken) {
      try {
        await socialLogin('facebook', response.accessToken);
      } catch (error) {
        console.error('Erro no login Facebook:', error);
      }
    }
  };

  return (
    <FacebookLogin
      appId={process.env.REACT_APP_FACEBOOK_APP_ID!}
      autoLoad={false}
      fields="name,email,picture"
      callback={responseFacebook}
      textButton="Login com Facebook"
    />
  );
}
*/

