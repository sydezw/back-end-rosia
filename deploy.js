#!/usr/bin/env node

/**
 * 🚀 Script de Deploy Automatizado para Vercel
 * 
 * Este script automatiza o processo de deploy do backend
 * da Rosita Floral Elegance no Vercel.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step} ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    logSuccess(`${description} encontrado`);
    return true;
  } else {
    logError(`${description} não encontrado: ${filePath}`);
    return false;
  }
}

function runCommand(command, description) {
  try {
    log(`Executando: ${command}`, 'blue');
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    logSuccess(description);
    return output;
  } catch (error) {
    logError(`Erro ao ${description.toLowerCase()}: ${error.message}`);
    throw error;
  }
}

function main() {
  log('🌹 DEPLOY BACKEND ROSITA FLORAL ELEGANCE', 'magenta');
  log('==========================================', 'magenta');

  try {
    // Verificar arquivos necessários
    logStep('1️⃣', 'Verificando arquivos necessários...');
    
    const requiredFiles = [
      { path: 'package.json', desc: 'package.json' },
      { path: 'server.js', desc: 'server.js' },
      { path: 'vercel.json', desc: 'vercel.json' },
      { path: '.env.example', desc: '.env.example' }
    ];

    let allFilesExist = true;
    requiredFiles.forEach(file => {
      if (!checkFile(file.path, file.desc)) {
        allFilesExist = false;
      }
    });

    if (!allFilesExist) {
      throw new Error('Arquivos necessários não encontrados');
    }

    // Verificar se o Vercel CLI está instalado
    logStep('2️⃣', 'Verificando Vercel CLI...');
    try {
      runCommand('vercel --version', 'Verificar versão do Vercel CLI');
    } catch (error) {
      logWarning('Vercel CLI não encontrado. Instalando...');
      runCommand('npm install -g vercel', 'Instalar Vercel CLI');
    }

    // Verificar se está logado no Vercel
    logStep('3️⃣', 'Verificando login no Vercel...');
    try {
      runCommand('vercel whoami', 'Verificar login no Vercel');
    } catch (error) {
      logWarning('Não está logado no Vercel. Execute: vercel login');
      throw new Error('Faça login no Vercel primeiro: vercel login');
    }

    // Verificar dependências
    logStep('4️⃣', 'Verificando dependências...');
    if (!fs.existsSync('node_modules')) {
      logWarning('node_modules não encontrado. Instalando dependências...');
      runCommand('npm install', 'Instalar dependências');
    } else {
      logSuccess('Dependências já instaladas');
    }

    // Executar testes (se existirem)
    logStep('5️⃣', 'Executando verificações...');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.test) {
      try {
        runCommand('npm test', 'Executar testes');
      } catch (error) {
        logWarning('Testes falharam, mas continuando deploy...');
      }
    } else {
      logWarning('Nenhum script de teste encontrado');
    }

    // Verificar variáveis de ambiente
    logStep('6️⃣', 'Verificando configurações...');
    if (fs.existsSync('.env')) {
      logWarning('Arquivo .env encontrado. Lembre-se de configurar as variáveis no Vercel!');
    }
    
    log('\n📋 VARIÁVEIS DE AMBIENTE NECESSÁRIAS NO VERCEL:', 'yellow');
    log('- SUPABASE_URL', 'yellow');
    log('- SUPABASE_ANON_KEY', 'yellow');
    log('- SUPABASE_SERVICE_ROLE_KEY', 'yellow');
    log('- JWT_SECRET', 'yellow');
    log('- FRONTEND_URL', 'yellow');
    log('- NODE_ENV=production', 'yellow');

    // Deploy
    logStep('7️⃣', 'Iniciando deploy no Vercel...');
    const deployOutput = runCommand('vercel --prod', 'Deploy no Vercel');
    
    // Extrair URL do deploy
    const urlMatch = deployOutput.match(/https:\/\/[^\s]+/);
    const deployUrl = urlMatch ? urlMatch[0] : null;

    if (deployUrl) {
      logSuccess(`Deploy concluído com sucesso!`);
      log(`\n🌐 URL do Backend: ${deployUrl}`, 'green');
      log(`\n📝 PRÓXIMOS PASSOS:`, 'cyan');
      log(`1. Configure as variáveis de ambiente no Vercel`, 'blue');
      log(`2. Atualize a URL no frontend: ${deployUrl}/api`, 'blue');
      log(`3. Teste o health check: ${deployUrl}/health`, 'blue');
      log(`4. Teste a autenticação: ${deployUrl}/api/auth/login`, 'blue');
      
      // Salvar URL em arquivo
      fs.writeFileSync('deploy-url.txt', deployUrl);
      logSuccess('URL salva em deploy-url.txt');
    } else {
      logWarning('Deploy concluído, mas não foi possível extrair a URL');
    }

  } catch (error) {
    logError(`Deploy falhou: ${error.message}`);
    log('\n🆘 SOLUÇÕES POSSÍVEIS:', 'yellow');
    log('1. Verifique se está logado: vercel login', 'yellow');
    log('2. Verifique as dependências: npm install', 'yellow');
    log('3. Verifique os arquivos necessários', 'yellow');
    log('4. Consulte o guia: DEPLOY-VERCEL.md', 'yellow');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };