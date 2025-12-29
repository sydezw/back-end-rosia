const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { findUserById } = require('../db/user-queries');
const { checkIfTokenInvalidated, getTokenStats } = require('../utils/tokenManager');
const router = express.Router();

/**
 * GET /debug/supabase
 * Endpoint para testar conectividade com Supabase
 */
router.get('/supabase', async (req, res) => {
  try {
    console.log('🔍 Testando conectividade com Supabase...');
    
    const environmentCheck = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      JWT_SECRET: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV
    };
    
    console.log('🔍 Environment Check:', environmentCheck);
    
    // Teste básico de conectividade
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro na consulta Supabase:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        environment: environmentCheck
      });
    }
    
    console.log('✅ Supabase conectado com sucesso');
    
    res.json({
      success: true,
      message: 'Supabase conectado com sucesso',
      environment: environmentCheck,
      queryResult: {
        hasData: !!data,
        dataLength: data?.length || 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro crítico no teste Supabase:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'SUPABASE_CONNECTION_ERROR',
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /debug/profile-test
 * Endpoint para testar operações específicas da tabela user_profiles
 */
router.get('/profile-test', async (req, res) => {
  try {
    console.log('🔍 Testando operações na tabela user_profiles...');
    
    // Teste 1: Verificar se tabela existe
    const { data: tableCheck, error: tableError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (tableError) {
      return res.status(500).json({
        success: false,
        test: 'table_exists',
        error: tableError.message,
        code: tableError.code
      });
    }
    
    // Teste 2: Tentar inserir um perfil de teste
    const testProfile = {
      id: `test_${Date.now()}`,
      email: 'test@example.com',
      full_name: 'Test User',
      provider: 'google',
      google_id: `test_google_${Date.now()}`,
      email_verified: true,
      last_login: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_profiles')
      .insert(testProfile)
      .select()
      .single();
    
    if (insertError) {
      return res.status(500).json({
        success: false,
        test: 'insert_profile',
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      });
    }
    
    // Teste 3: Limpar dados de teste
    await supabase
      .from('user_profiles')
      .delete()
      .eq('id', testProfile.id);
    
    res.json({
      success: true,
      message: 'Todos os testes passaram',
      tests: {
        table_exists: '✅ Passou',
        insert_profile: '✅ Passou',
        cleanup: '✅ Passou'
      },
      insertedProfile: insertData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de perfil:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'PROFILE_TEST_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /debug/token
 * Endpoint temporário para debug de tokens JWT
 */
router.get('/token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('🔧 Debug Token - Headers:', req.headers);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin
      },
      token: {
        provided: !!token,
        length: token?.length,
        preview: token ? `${token.substring(0, 30)}...` : 'N/A'
      },
      environment: {
        jwtSecret: process.env.JWT_SECRET ? 'Configured' : 'Missing',
        supabaseUrl: process.env.SUPABASE_URL ? 'Configured' : 'Missing',
        nodeEnv: process.env.NODE_ENV
      }
    };
    
    if (!token) {
      return res.json({
        ...debugInfo,
        status: 'ERROR',
        message: 'Token não fornecido'
      });
    }
    
    // Testar validação JWT personalizado
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      debugInfo.jwt = {
        valid: true,
        userId: decoded.userId,
        email: decoded.email,
        iat: decoded.iat,
        exp: decoded.exp,
        expired: Date.now() >= decoded.exp * 1000
      };
      
      // Testar busca do usuário no banco
      const user = await findUserById(decoded.userId);
      debugInfo.database = {
        userFound: !!user,
        userId: user?.id,
        userEmail: user?.email
      };
      
    } catch (jwtError) {
      debugInfo.jwt = {
        valid: false,
        error: jwtError.message,
        name: jwtError.name
      };
    }
    
    // Testar validação com Supabase (se aplicável)
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      debugInfo.supabase = {
        valid: !error && !!user,
        error: error?.message,
        userId: user?.id,
        userEmail: user?.email
      };
    } catch (supabaseError) {
      debugInfo.supabase = {
        valid: false,
        error: supabaseError.message
      };
    }
    
    res.json({
      ...debugInfo,
      status: 'SUCCESS',
      message: 'Debug completo'
    });
    
  } catch (error) {
    console.error('Erro no debug:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erro interno no debug',
      error: error.message
    });
  }
});

/**
 * GET /debug/env
 * Verificar variáveis de ambiente (sem expor valores)
 */
router.get('/env', (req, res) => {
  const envVars = {
    JWT_SECRET: process.env.JWT_SECRET ? 'Configured' : 'Missing',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'Configured' : 'Missing',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Configured' : 'Missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Missing',
    NODE_ENV: process.env.NODE_ENV || 'Not set',
    PORT: process.env.PORT || 'Not set'
  };
  
  res.json({
    status: 'SUCCESS',
    environment: envVars,
    timestamp: new Date().toISOString()
  });
});

// Endpoint para testar configuração do Supabase
router.get('/supabase-config', (req, res) => {
  res.json({
    supabase_url: process.env.SUPABASE_URL ? 'Configurado' : 'Não configurado',
    supabase_anon_key: process.env.SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado',
    supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurado' : 'Não configurado',
    url_preview: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'N/A'
  });
});

// Endpoint para testar token do Supabase
router.post('/test-supabase-token', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e senha são obrigatórios',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Verificar configuração do Supabase
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({
        error: 'Configuração do Supabase incompleta',
        code: 'SUPABASE_CONFIG_ERROR',
        details: {
          url: !!process.env.SUPABASE_URL,
          anon_key: !!process.env.SUPABASE_ANON_KEY
        }
      });
    }

    // Tentar fazer login com Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({
        error: `Erro no login: ${error.message}`,
        code: 'LOGIN_ERROR',
        details: error
      });
    }

    if (!data.session || !data.session.access_token) {
      return res.status(400).json({
        error: 'Sessão ou token não encontrado',
        code: 'NO_SESSION'
      });
    }

    // Verificar se o token é válido
    const { data: userData, error: userError } = await supabase.auth.getUser(data.session.access_token);
    
    if (userError) {
      return res.status(400).json({
        error: `Token inválido: ${userError.message}`,
        code: 'INVALID_TOKEN',
        details: userError
      });
    }

    res.json({
      success: true,
      message: 'Token gerado e validado com sucesso',
      token: data.session.access_token,
      user: {
        id: userData.user.id,
        email: userData.user.email,
        created_at: userData.user.created_at
      },
      expires_at: data.session.expires_at
    });

  } catch (error) {
    console.error('Erro no teste de token Supabase:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

// Endpoint para testar validação de token específico
router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: 'Token é obrigatório',
        code: 'MISSING_TOKEN'
      });
    }

    // Testar validação do token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      return res.status(401).json({
        error: `Token inválido: ${error.message}`,
        code: 'INVALID_TOKEN',
        details: error
      });
    }

    if (!user) {
      return res.status(401).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Token válido',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }
    });

  } catch (error) {
    console.error('Erro na validação de token:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

// Endpoint para testar middleware de autenticação com sistema de invalidação
router.get('/test-auth-middleware', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔍 Debug Auth Middleware:');
    console.log('- Authorization Header:', authHeader ? 'Presente' : 'Ausente');
    console.log('- Header completo:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de acesso requerido',
        debug: {
          hasHeader: !!authHeader,
          startsWithBearer: authHeader ? authHeader.startsWith('Bearer ') : false,
          headerValue: authHeader || 'null'
        }
      });
    }

    const token = authHeader.substring(7);
    console.log('- Token extraído:', token.substring(0, 20) + '...');
    
    // Verificar se o token foi invalidado
    const isInvalidated = await checkIfTokenInvalidated(token);
    console.log('- Token invalidado?', isInvalidated);
    
    if (isInvalidated) {
      return res.status(401).json({
        success: false,
        error: 'Token foi invalidado (logout realizado)',
        code: 'TOKEN_INVALIDATED',
        debug: {
          tokenLength: token.length,
          invalidated: true,
          tokenStats: getTokenStats()
        }
      });
    }
    
    // Verificar se é um JWT personalizado
    let isCustomJWT = false;
    let jwtUser = null;
    
    try {
      if (process.env.JWT_SECRET) {
        jwtUser = jwt.verify(token, process.env.JWT_SECRET);
        isCustomJWT = true;
        console.log('- JWT personalizado válido:', { userId: jwtUser.userId, email: jwtUser.email });
        
        // Buscar usuário no banco
        const user = await findUserById(jwtUser.userId);
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'Usuário não encontrado no banco',
            code: 'USER_NOT_FOUND',
            debug: {
              tokenType: 'custom_jwt',
              userId: jwtUser.userId
            }
          });
        }
        
        return res.json({
          success: true,
          message: 'Token JWT personalizado válido e middleware funcionando',
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          },
          debug: {
            tokenType: 'custom_jwt',
            tokenLength: token.length,
            invalidated: false,
            tokenStats: getTokenStats()
          }
        });
      }
    } catch (jwtError) {
      console.log('- Não é JWT personalizado, testando com Supabase...');
    }
    
    // Verificar configuração do Supabase
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Configuração do Supabase não encontrada',
        config: {
          url: !!process.env.SUPABASE_URL,
          key: !!process.env.SUPABASE_ANON_KEY
        }
      });
    }
    
    // Testar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    console.log('- Resultado Supabase:', { user: !!user, error: !!error });
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado',
        debug: {
          tokenType: 'supabase',
          supabaseError: error ? error.message : null,
          hasUser: !!user,
          tokenLength: token.length,
          invalidated: false,
          tokenStats: getTokenStats()
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Token Supabase válido e middleware funcionando',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      debug: {
        tokenType: 'supabase',
        tokenLength: token.length,
        supabaseConnected: true,
        invalidated: false,
        tokenStats: getTokenStats()
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Listar últimos pedidos (debug)
router.get('/orders/recent', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id,user_id,subtotal,shipping_cost,total,status,payment_method,payment_status,payment_id,items,shipping_address,created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.json({ success: true, orders });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Listar últimos itens de pedidos (debug)
router.get('/order-items/recent', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { data: items, error } = await supabase
      .from('order_items')
      .select('id,order_id,product_id,quantity,unit_price,selected_size,selected_color,created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.json({ success: true, items });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/orders/backfill-items', async (req, res) => {
  try {
    const { supabaseAdmin } = require('../config/supabase');
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, created_at')
      .is('items', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (ordersErr) {
      return res.status(500).json({ success: false, error: ordersErr.message });
    }

    const results = [];
    for (const order of orders || []) {
      const { data: rows, error: itemsErr } = await supabaseAdmin
        .from('order_items')
        .select('product_id, product_name, quantity, unit_price, selected_size, selected_color')
        .eq('order_id', order.id);
      if (itemsErr) {
        results.push({ order_id: order.id, updated: false, error: itemsErr.message });
        continue;
      }
      const items = (rows || []).map(r => ({
        product_id: r.product_id,
        product_name: r.product_name,
        quantity: r.quantity,
        product_price: Number(r.unit_price),
        total: Number(r.unit_price) * Number(r.quantity),
        size: r.selected_size || null,
        color: r.selected_color || null
      }));
      const { error: updateErr } = await supabaseAdmin
        .from('orders')
        .update({ items })
        .eq('id', order.id);
      results.push({ order_id: order.id, updated: !updateErr, error: updateErr ? updateErr.message : null, items_count: items.length });
    }

    res.json({ success: true, processed: results.length, results });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Endpoint para obter estatísticas dos tokens invalidados
router.get('/token-stats', (req, res) => {
  try {
    const stats = getTokenStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Endpoint para debug de tokens do Google
router.post('/google-token', async (req, res) => {
  try {
    const { token } = req.body;
    const { verifyGoogleToken } = require('../utils/google-auth');
    
    console.log('🔍 Debug Google Token - Iniciando análise');
    
    if (!token) {
      return res.status(400).json({
        error: 'Token é obrigatório',
        code: 'MISSING_TOKEN'
      });
    }
    
    // Informações básicas do token
    const tokenInfo = {
      length: token.length,
      starts_with: token.substring(0, 20),
      ends_with: token.substring(token.length - 20),
      has_dots: (token.match(/\./g) || []).length,
      is_jwt_format: token.split('.').length === 3
    };
    
    console.log('🔍 Token Info:', tokenInfo);
    
    // Tentar decodificar o header do JWT sem verificar
    let jwtHeader = null;
    let jwtPayload = null;
    
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        jwtHeader = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
        jwtPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        
        console.log('🔍 JWT Header:', jwtHeader);
        console.log('🔍 JWT Payload (parcial):', {
          iss: jwtPayload.iss,
          aud: jwtPayload.aud,
          iat: jwtPayload.iat,
          exp: jwtPayload.exp,
          nbf: jwtPayload.nbf,
          email: jwtPayload.email
        });
        
        // Verificar timestamps
        const now = Math.floor(Date.now() / 1000);
        const timingInfo = {
          current_time: now,
          issued_at: jwtPayload.iat,
          not_before: jwtPayload.nbf,
          expires_at: jwtPayload.exp,
          time_diff_iat: now - jwtPayload.iat,
          time_diff_nbf: now - (jwtPayload.nbf || jwtPayload.iat),
          time_until_exp: jwtPayload.exp - now
        };
        
        console.log('🔍 Timing Info:', timingInfo);
      }
    } catch (decodeError) {
      console.log('❌ Erro ao decodificar JWT:', decodeError.message);
    }
    
    // Tentar verificar com Google
    let googleResult = null;
    let googleError = null;
    
    try {
      googleResult = await verifyGoogleToken(token);
      console.log('✅ Token Google válido');
    } catch (error) {
      googleError = {
        message: error.message,
        stack: error.stack
      };
      console.log('❌ Erro na verificação Google:', error.message);
    }
    
    res.json({
      success: !googleError,
      token_info: tokenInfo,
      jwt_header: jwtHeader,
      jwt_payload_partial: jwtPayload ? {
        iss: jwtPayload.iss,
        aud: jwtPayload.aud,
        iat: jwtPayload.iat,
        exp: jwtPayload.exp,
        nbf: jwtPayload.nbf,
        email: jwtPayload.email
      } : null,
      timing_info: jwtPayload ? {
        current_time: Math.floor(Date.now() / 1000),
        issued_at: jwtPayload.iat,
        not_before: jwtPayload.nbf,
        expires_at: jwtPayload.exp,
        time_diff_iat: Math.floor(Date.now() / 1000) - jwtPayload.iat,
        time_diff_nbf: Math.floor(Date.now() / 1000) - (jwtPayload.nbf || jwtPayload.iat),
        time_until_exp: jwtPayload.exp - Math.floor(Date.now() / 1000)
      } : null,
      google_verification: {
        success: !!googleResult,
        error: googleError,
        result: googleResult ? {
          email: googleResult.email,
          name: googleResult.name,
          sub: googleResult.sub
        } : null
      },
      environment: {
        google_client_id_configured: !!process.env.GOOGLE_CLIENT_ID,
        node_env: process.env.NODE_ENV,
        server_time: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no debug do token Google:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Endpoint para debug de tokens do Google
router.post('/google-token', async (req, res) => {
  try {
    const { token } = req.body;
    const { verifyGoogleToken } = require('../utils/google-auth');
    
    console.log('🔍 Debug Google Token - Iniciando análise');
    
    if (!token) {
      return res.status(400).json({
        error: 'Token é obrigatório',
        code: 'MISSING_TOKEN'
      });
    }
    
    // Informações básicas do token
    const tokenInfo = {
      length: token.length,
      starts_with: token.substring(0, 20),
      ends_with: token.substring(token.length - 20),
      has_dots: (token.match(/\./g) || []).length,
      is_jwt_format: token.split('.').length === 3
    };
    
    console.log('🔍 Token Info:', tokenInfo);
    
    // Tentar decodificar o header do JWT sem verificar
    let jwtHeader = null;
    let jwtPayload = null;
    
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        jwtHeader = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
        jwtPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        
        console.log('🔍 JWT Header:', jwtHeader);
        console.log('🔍 JWT Payload (parcial):', {
          iss: jwtPayload.iss,
          aud: jwtPayload.aud,
          iat: jwtPayload.iat,
          exp: jwtPayload.exp,
          nbf: jwtPayload.nbf,
          email: jwtPayload.email
        });
        
        // Verificar timestamps
        const now = Math.floor(Date.now() / 1000);
        const timingInfo = {
          current_time: now,
          issued_at: jwtPayload.iat,
          not_before: jwtPayload.nbf,
          expires_at: jwtPayload.exp,
          time_diff_iat: now - jwtPayload.iat,
          time_diff_nbf: now - (jwtPayload.nbf || jwtPayload.iat),
          time_until_exp: jwtPayload.exp - now
        };
        
        console.log('🔍 Timing Info:', timingInfo);
      }
    } catch (decodeError) {
      console.log('❌ Erro ao decodificar JWT:', decodeError.message);
    }
    
    // Tentar verificar com Google
    let googleResult = null;
    let googleError = null;
    
    try {
      googleResult = await verifyGoogleToken(token);
      console.log('✅ Token Google válido');
    } catch (error) {
      googleError = {
        message: error.message,
        stack: error.stack
      };
      console.log('❌ Erro na verificação Google:', error.message);
    }
    
    res.json({
      success: !googleError,
      token_info: tokenInfo,
      jwt_header: jwtHeader,
      jwt_payload_partial: jwtPayload ? {
        iss: jwtPayload.iss,
        aud: jwtPayload.aud,
        iat: jwtPayload.iat,
        exp: jwtPayload.exp,
        nbf: jwtPayload.nbf,
        email: jwtPayload.email
      } : null,
      timing_info: jwtPayload ? {
        current_time: Math.floor(Date.now() / 1000),
        issued_at: jwtPayload.iat,
        not_before: jwtPayload.nbf,
        expires_at: jwtPayload.exp,
        time_diff_iat: Math.floor(Date.now() / 1000) - jwtPayload.iat,
        time_diff_nbf: Math.floor(Date.now() / 1000) - (jwtPayload.nbf || jwtPayload.iat),
        time_until_exp: jwtPayload.exp - Math.floor(Date.now() / 1000)
      } : null,
      google_verification: {
        success: !!googleResult,
        error: googleError,
        result: googleResult ? {
          email: googleResult.email,
          name: googleResult.name,
          sub: googleResult.sub
        } : null
      },
      environment: {
        google_client_id_configured: !!process.env.GOOGLE_CLIENT_ID,
        node_env: process.env.NODE_ENV,
        server_time: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no debug do token Google:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

module.exports = router;

