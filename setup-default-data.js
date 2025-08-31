require('dotenv').config();
const { supabase } = require('./config/supabase');

/**
 * Script para adicionar categorias e tamanhos padrão
 */
async function setupDefaultData() {
  try {
    console.log('🚀 Configurando dados padrão...');
    
    // Categorias padrão
    const defaultCategories = [
      'Camisetas',
      'Vestidos',
      'Calças',
      'Shorts',
      'Saias',
      'Blusas',
      'Jaquetas',
      'Acessórios'
    ];
    
    // Tamanhos padrão
    const defaultSizes = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
    
    // Cores padrão
    const defaultColors = [
      'Branco',
      'Preto',
      'Azul',
      'Vermelho',
      'Verde',
      'Amarelo',
      'Rosa',
      'Roxo',
      'Cinza',
      'Marrom'
    ];
    
    console.log('📝 Verificando produtos existentes...');
    
    // Buscar produtos que não têm categorias, tamanhos ou cores definidos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, category, sizes, colors')
      .or('category.is.null,sizes.is.null,colors.is.null');
    
    if (productsError) {
      console.error('Erro ao buscar produtos:', productsError);
      return;
    }
    
    console.log(`📊 Encontrados ${products.length} produtos para atualizar`);
    
    // Atualizar produtos sem dados padrão
    for (const product of products) {
      const updates = {};
      
      // Definir categoria padrão se não existir
      if (!product.category) {
        updates.category = defaultCategories[0]; // 'Camisetas' como padrão
      }
      
      // Definir tamanhos padrão se não existir
      if (!product.sizes || product.sizes.length === 0) {
        updates.sizes = defaultSizes;
      }
      
      // Definir cores padrão se não existir
      if (!product.colors || product.colors.length === 0) {
        updates.colors = defaultColors.slice(0, 3); // Primeiras 3 cores como padrão
      }
      
      // Atualizar produto se houver mudanças
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('products')
          .update(updates)
          .eq('id', product.id);
        
        if (updateError) {
          console.error(`Erro ao atualizar produto ${product.id}:`, updateError);
        } else {
          console.log(`✅ Produto ${product.id} atualizado`);
        }
      }
    }
    
    console.log('🎉 Dados padrão configurados com sucesso!');
    console.log('📋 Categorias disponíveis:', defaultCategories.join(', '));
    console.log('📏 Tamanhos disponíveis:', defaultSizes.join(', '));
    console.log('🎨 Cores disponíveis:', defaultColors.join(', '));
    
  } catch (error) {
    console.error('❌ Erro ao configurar dados padrão:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupDefaultData()
    .then(() => {
      console.log('🎉 Script concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { setupDefaultData };