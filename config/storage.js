const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Configuração do cliente Supabase para Storage
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Chave de serviço para bypass do RLS

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Nome do bucket para imagens de produtos
const BUCKET_NAME = 'product-images';

// Função para fazer upload de uma única imagem
const uploadImage = async (imageBuffer, filename, folder = 'products') => {
  try {
    const filePath = `${folder}/${filename}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, imageBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw new Error(`Erro no upload: ${error.message}`);
    }
    
    // Obter URL pública da imagem
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
      filename: filename
    };
  } catch (error) {
    console.error('Erro no upload da imagem:', error);
    throw error;
  }
};

// Função para fazer upload de múltiplas imagens
const uploadMultipleImages = async (images, folder = 'products') => {
  try {
    const uploadPromises = images.map(image => 
      uploadImage(image.buffer, image.filename, folder)
    );
    
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Erro no upload de múltiplas imagens:', error);
    throw error;
  }
};

// Função para deletar uma imagem
const deleteImage = async (imagePath) => {
  try {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([imagePath]);
    
    if (error) {
      throw new Error(`Erro ao deletar imagem: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    throw error;
  }
};

// Função para deletar múltiplas imagens
const deleteMultipleImages = async (imagePaths) => {
  try {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove(imagePaths);
    
    if (error) {
      throw new Error(`Erro ao deletar imagens: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao deletar múltiplas imagens:', error);
    throw error;
  }
};

// Função para listar imagens de um produto
const listProductImages = async (productId) => {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(`products/${productId}`, {
        limit: 100,
        offset: 0
      });
    
    if (error) {
      throw new Error(`Erro ao listar imagens: ${error.message}`);
    }
    
    return data.map(file => ({
      name: file.name,
      path: `products/${productId}/${file.name}`,
      publicUrl: supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(`products/${productId}/${file.name}`).data.publicUrl
    }));
  } catch (error) {
    console.error('Erro ao listar imagens do produto:', error);
    throw error;
  }
};

// Função para criar o bucket se não existir
const createBucketIfNotExists = async () => {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      throw new Error(`Erro ao listar buckets: ${listError.message}`);
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      const { data, error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (error) {
        throw new Error(`Erro ao criar bucket: ${error.message}`);
      }
      
      console.log(`Bucket '${BUCKET_NAME}' criado com sucesso`);
      return data;
    }
    
    console.log(`Bucket '${BUCKET_NAME}' já existe`);
    return true;
  } catch (error) {
    console.error('Erro ao verificar/criar bucket:', error);
    throw error;
  }
};

// Função para gerar nome único de arquivo
const generateUniqueFilename = (originalName, productId = null) => {
  const extension = '.webp'; // Sempre usar WebP após otimização
  const timestamp = Date.now();
  const uuid = uuidv4().substring(0, 8);
  
  if (productId) {
    return `${productId}_${timestamp}_${uuid}${extension}`;
  }
  
  return `${timestamp}_${uuid}${extension}`;
};

module.exports = {
  supabaseAdmin,
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  listProductImages,
  createBucketIfNotExists,
  generateUniqueFilename,
  BUCKET_NAME
};

