#!/usr/bin/env node

/**
 * Script para configurar variáveis de ambiente do Google OAuth na Vercel
 * 
 * Pré-requisitos:
 * 1. Instalar Vercel CLI: npm i -g vercel
 * 2. Fazer login: vercel login
 * 3. Executar: node setup-vercel-env.js
 */

const { execSync } = require('child_process');

// ⚠️ IMPORTANTE: Substitua pelas credenciais reais antes de executar
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'SUBSTITUA_PELA_CREDENCIAL_REAL';
const  = process.env.GOOGLE_CLIENT_SECRET || 'SUBSTITUA_PELA_CREDENCIAL_REAL';

function runCommand(command) {
  try {
    console.log(`🔄 ExecutGOOGLE_CLIENT_SECRETando: ${command}`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    console.log('✅ Sucesso!');
    return result;
  } catch (error) {
    console.error(`❌ Erro ao executar: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

function setupVercelEnv() {
  console.log('🚀 Configurando variáveis de ambiente do Google OAuth na Vercel...');
  console.log('');

  // Verificar se está logado na Vercel
  try {
    execSync('vercel whoami', { encoding: 'utf8' });
  } catch (error) {
    console.error('❌ Você não está logado na Vercel.');
    console.log('Execute: vercel login');
    process.exit(1);
  }

  // Configurar GOOGLE_CLIENT_ID
  console.log('📝 Configurando GOOGLE_CLIENT_ID...');
  runCommand(`vercel env add GOOGLE_CLIENT_ID production`);
  
  // Configurar GOOGLE_CLIENT_SECRET
  console.log('📝 Configurando GOOGLE_CLIENT_SECRET...');
  runCommand(`vercel env add GOOGLE_CLIENT_SECRET production`);
  
  console.log('');
  console.log('✅ Variáveis de ambiente configuradas com sucesso!');
  console.log('');
  console.log('🔄 Para aplicar as mudanças, execute:');
  console.log('   vercel --prod');
  console.log('');
  console.log('🧪 Para testar o endpoint:');
  console.log('   curl -X POST https://back-end-rosia02.vercel.app/api/auth/login/google \\');
  console.log('        -H "Content-Type: application/json" \\');
  console.log('        -d \'{\'"token\'":\'"seu_google_token_aqui\'"}\'');
}

if (require.main === module) {
  setupVercelEnv();
}

module.exports = { setupVercelEnv };

