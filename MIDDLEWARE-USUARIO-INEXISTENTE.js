// MIDDLEWARE MELHORADO PARA TRATAR USUÁRIOS INEXISTENTES
// Este arquivo contém melhorias para o middleware authenticateGoogleUser

require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

/**
 * Middleware melhorado para autenticar usuários Google com tratamento de usuários inexistentes
 */
const authenticateGoogleUserImproved = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Google Auth Improved - Token:', {
    provided: !!token,
    length: token?.length,
    preview: token ? `${token.substring(0, 20)}...` : 'N/A'
  });

  if (!token) {
    console.log('❌ Google Auth Error: Token não fornecido');
    return res.status(401).json({ 
      success: false, 
      message: 'Token de acesso requerido para usuários Google',
      code: 'MISSING_GOOGLE_TOKEN',
      action: 'REDIRECT_TO_LOGIN'
    });
  }

  try {
    console.log('🔍 Verificando token do Supabase para usuário Google...');
    
    // Validar token com Supabase Admin
    const { data: { user: supabaseUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !supabaseUser) {
      console.log('❌ Token do Supabase inválido:', authError?.message);
      
      // Verificar se é erro de usuário não encontrado
      if (authError?.message?.includes('User not found') || 
          authError?.message?.includes('Invalid JWT') ||
          authError?.message?.includes('JWT expired')) {
        
        return res.status(401).json({ 
          success: false, 
          message: 'Usuário não encontrado ou sessão expirada',
          code: 'USER_NOT_FOUND',
          debug: {
            error: authError?.message,
            suggestion: 'Faça login novamente'
          },
          action: 'REDIRECT_TO_LOGIN'
        });
      }
      
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido para usuários Google',
        code: 'INVALID_GOOGLE_TOKEN_TYPE',
        debug: {
          error: authError?.message
        },
        action: 'REDIRECT_TO_LOGIN'
      });
    }
    
    console.log('✅ Token do Supabase válido para usuário:', supabaseUser.email);
    console.log('🔍 Metadados do usuário:', supabaseUser.app_metadata);

    // Verificar se é um usuário Google através dos metadados
    const isGoogleUser = supabaseUser.app_metadata?.provider === 'google' || 
                        supabaseUser.app_metadata?.providers?.includes('google') ||
                        supabaseUser.user_metadata?.provider === 'google';
    
    if (!isGoogleUser) {
      console.log('❌ Usuário não é do tipo Google');
      return res.status(401).json({ 
        success: false, 
        message: 'Token não é de usuário Google',
        code: 'NOT_GOOGLE_USER',
        debug: {
          provider: supabaseUser.app_metadata?.provider,
          suggestion: 'Use o endpoint correto para seu tipo de usuário'
        },
        action: 'USE_CORRECT_ENDPOINT'
      });
    }
    
    // Buscar usuário na tabela google_user_profiles
    const googleId = supabaseUser.user_metadata?.sub || supabaseUser.id;
    
    console.log('🔍 Buscando usuário na tabela google_user_profiles...');
    console.log('🔍 Google ID:', googleId);
    console.log('🔍 Email:', supabaseUser.email);
    
    let { data: user, error } = await supabaseAdmin
      .from('google_user_profiles')
      .select('*')
      .eq('google_id', googleId)
      .single();
    
    // Se não encontrou pelo google_id, tentar pelo email
    if (error || !user) {
      console.log('🔍 Não encontrado pelo google_id, tentando pelo email...');
      
      const { data: userByEmail, error: emailError } = await supabaseAdmin
        .from('google_user_profiles')
        .select('*')
        .eq('email', supabaseUser.email)
        .single();
      
      user = userByEmail;
      error = emailError;
    }
    
    if (error || !user) {
      console.error('❌ Usuário Google não encontrado na tabela google_user_profiles:', error);
      
      // Tentar criar o perfil automaticamente
      console.log('🔧 Tentando criar perfil automaticamente...');
      
      try {
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('google_user_profiles')
          .insert({
            google_id: supabaseUser.id,
            email: supabaseUser.email,
            nome: supabaseUser.user_metadata?.full_name || 
                  supabaseUser.user_metadata?.name || 
                  supabaseUser.email.split('@')[0],
            avatar_url: supabaseUser.user_metadata?.avatar_url || null
          })
          .select()
          .single();
        
        if (createError) {
          console.error('❌ Erro ao criar perfil automaticamente:', createError);
          
          return res.status(401).json({ 
            success: false, 
            message: 'Usuário não encontrado e não foi possível criar perfil',
            code: 'USER_NOT_FOUND',
            debug: {
              userId: supabaseUser.id,
              email: supabaseUser.email,
              createError: createError.message,
              suggestion: 'Entre em contato com o suporte'
            },
            action: 'CONTACT_SUPPORT'
          });
        }
        
        console.log('✅ Perfil criado automaticamente:', newUser);
        user = newUser;
        
      } catch (autoCreateError) {
        console.error('❌ Erro fatal ao criar perfil:', autoCreateError);
        
        return res.status(401).json({ 
          success: false, 
          message: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND',
          debug: {
            userId: supabaseUser.id,
            email: supabaseUser.email,
            suggestion: 'Usuário pode ter sido removido do sistema ou houve erro de sincronização'
          },
          action: 'REDIRECT_TO_LOGIN'
        });
      }
    }
    
    console.log('✅ Usuário Google autenticado:', user.email);
    
    // Adicionar informações ao request para uso nos controllers
    req.user = user;
    req.supabaseUser = supabaseUser;
    req.provider = 'google-supabase';
    req.googleId = googleId;
    
    next();
    
  } catch (error) {
    console.error('❌ Erro no middleware de autenticação Google:', error);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor durante autenticação',
      code: 'INTERNAL_AUTH_ERROR',
      debug: {
        error: error.message,
        suggestion: 'Tente novamente em alguns instantes'
      },
      action: 'RETRY_LATER'
    });
  }
};

// Função para testar o middleware melhorado
async function testarMiddlewareImproved() {
  console.log('🧪 TESTANDO MIDDLEWARE MELHORADO');
  console.log('=================================\n');
  
  // Simular requisição com usuário inexistente
  const mockReq = {
    headers: {
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyYzFmNDA0OC1iNzUxLTQ0OTMtYTYyZC0wMDkwZmRlODJlNTMiLCJlbWFpbCI6InRlc3RlQGV4YW1wbGUuY29tIiwiaWF0IjoxNjAwMDAwMDAwfQ.invalid'
    }
  };
  
  const mockRes = {
    status: (code) => ({
      json: (data) => {
        console.log(`📥 Resposta ${code}:`, JSON.stringify(data, null, 2));
        return data;
      }
    })
  };
  
  const mockNext = () => {
    console.log('✅ Middleware passou, usuário autenticado');
  };
  
  console.log('🔍 Testando com token inválido...');
  await authenticateGoogleUserImproved(mockReq, mockRes, mockNext);
  
  console.log('\n✅ Teste concluído!');
}

module.exports = {
  authenticateGoogleUserImproved
};

// Se executado diretamente, rodar teste
if (require.main === module) {
  testarMiddlewareImproved()
    .then(() => {
      console.log('\n🏁 Teste finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro no teste:', error);
      process.exit(1);
    });
}