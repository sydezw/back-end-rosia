/**
 * CORREÇÃO URGENTE: Frontend fazendo requisições para porta errada
 * 
 * O frontend está tentando acessar localhost:8080 mas o backend roda em https://back-end-rosia02.vercel.app
 * Este script corrige a configuração da URL base no frontend.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORREÇÃO: URL do Frontend (8080 → 3030)');
console.log('=' .repeat(50));

// Função para corrigir URLs em arquivos
function corrigirUrlsEmArquivo(caminhoArquivo, descricao) {
  try {
    if (!fs.existsSync(caminhoArquivo)) {
      console.log(`⚠️  Arquivo não encontrado: ${caminhoArquivo}`);
      return false;
    }
    
    let conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
    const conteudoOriginal = conteudo;
    
    // Substituir localhost:8080 por https://back-end-rosia02.vercel.app
    conteudo = conteudo.replace(/localhost:8080/g, 'https://back-end-rosia02.vercel.app');
    
    if (conteudo !== conteudoOriginal) {
      fs.writeFileSync(caminhoArquivo, conteudo, 'utf8');
      console.log(`✅ ${descricao}: URLs corrigidas`);
      return true;
    } else {
      console.log(`ℹ️  ${descricao}: Nenhuma URL para corrigir`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erro ao corrigir ${descricao}:`, error.message);
    return false;
  }
}

// Lista de arquivos comuns do frontend que podem ter URLs incorretas
const arquivosFrontend = [
  // Configurações de API
  '../frontend/src/config/api.ts',
  '../frontend/src/config/api.js',
  '../frontend/src/services/api.ts',
  '../frontend/src/services/api.js',
  
  // Interceptadores
  '../frontend/src/utils/endpoint-interceptor.ts',
  '../frontend/src/utils/endpoint-interceptor.js',
  
  // APIs específicas
  '../frontend/src/services/google-user-profile-api.ts',
  '../frontend/src/services/google-user-profile-api.js',
  '../frontend/src/api/google-user-profile-api.ts',
  '../frontend/src/api/google-user-profile-api.js',
  
  // Arquivos de configuração
  '../frontend/.env',
  '../frontend/.env.local',
  '../frontend/.env.development',
  '../frontend/vite.config.js',
  '../frontend/vite.config.ts',
  '../frontend/next.config.js',
  
  // Componentes que fazem requisições
  '../frontend/src/components/ProfileSettings.tsx',
  '../frontend/src/components/ProfileSettings.jsx',
  '../frontend/src/pages/ProfileSettings.tsx',
  '../frontend/src/pages/ProfileSettings.jsx'
];

console.log('🔍 Procurando arquivos do frontend...');

let arquivosCorrigidos = 0;
let arquivosEncontrados = 0;

for (const arquivo of arquivosFrontend) {
  const caminhoCompleto = path.resolve(__dirname, arquivo);
  
  if (fs.existsSync(caminhoCompleto)) {
    arquivosEncontrados++;
    const nomeArquivo = path.basename(arquivo);
    
    if (corrigirUrlsEmArquivo(caminhoCompleto, nomeArquivo)) {
      arquivosCorrigidos++;
    }
  }
}

console.log('\n' + '='.repeat(50));
console.log('📊 RESULTADO:');
console.log(`- Arquivos encontrados: ${arquivosEncontrados}`);
console.log(`- Arquivos corrigidos: ${arquivosCorrigidos}`);

if (arquivosCorrigidos > 0) {
  console.log('\n✅ URLs corrigidas com sucesso!');
  console.log('💡 Reinicie o servidor do frontend para aplicar as mudanças');
} else if (arquivosEncontrados === 0) {
  console.log('\n⚠️  Nenhum arquivo do frontend encontrado');
  console.log('💡 Verifique se o frontend está na pasta correta');
} else {
  console.log('\n ℹ️  Nenhuma URL precisou ser corrigida');
}

// Instruções para correção manual
console.log('\n' + '='.repeat(50));
console.log('📋 INSTRUÇÕES PARA CORREÇÃO MANUAL:');
console.log('\n1. No seu projeto frontend, procure por:');
console.log('   - localhost:8080');
console.log('   - http://localhost:8080');
console.log('\n2. Substitua por:');
console.log('   - https://back-end-rosia02.vercel.app');
console.log('   - https://back-end-rosia02.vercel.app');
console.log('\n3. Arquivos comuns a verificar:');
console.log('   - src/config/api.ts ou api.js');
console.log('   - .env ou .env.local');
console.log('   - vite.config.js ou next.config.js');
console.log('   - Componentes que fazem fetch()');
console.log('\n4. Reinicie o servidor do frontend após as correções');

console.log('\n🎯 O backend está rodando corretamente em https://back-end-rosia02.vercel.app');

