const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  uploadSingle,
  uploadMultiple,
  processImage,
  validateProductData
} = require('../middleware/imageValidation');
const {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  generateUniqueFilename
} = require('../config/storage');
const { supabase } = require('../config/supabase');

// Middleware de autenticação para todas as rotas de upload
router.use(authenticateToken);

// Upload de uma única imagem
router.post('/single', uploadSingle, processImage, async (req, res) => {
  try {
    if (!req.processedImage) {
      return res.status(400).json({
        error: 'Nenhuma imagem processada encontrada'
      });
    }

    const filename = generateUniqueFilename(req.processedImage.originalname);
    const uploadResult = await uploadImage(
      req.processedImage.buffer,
      filename,
      'general'
    );

    res.json({
      message: 'Imagem enviada com sucesso',
      image: {
        filename: uploadResult.filename,
        url: uploadResult.publicUrl,
        path: uploadResult.path
      }
    });
  } catch (error) {
    console.error('Erro no upload de imagem única:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao fazer upload da imagem'
    });
  }
});

// Upload de múltiplas imagens
router.post('/multiple', uploadMultiple, processImage, async (req, res) => {
  try {
    if (!req.processedImages || req.processedImages.length === 0) {
      return res.status(400).json({
        error: 'Nenhuma imagem processada encontrada'
      });
    }

    // Gerar nomes únicos para cada imagem
    const imagesWithFilenames = req.processedImages.map(image => ({
      ...image,
      filename: generateUniqueFilename(image.originalname)
    }));

    const uploadResults = await uploadMultipleImages(imagesWithFilenames, 'general');

    res.json({
      message: `${uploadResults.length} imagens enviadas com sucesso`,
      images: uploadResults.map(result => ({
        filename: result.filename,
        url: result.publicUrl,
        path: result.path
      }))
    });
  } catch (error) {
    console.error('Erro no upload de múltiplas imagens:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao fazer upload das imagens'
    });
  }
});

// Upload de imagens para produto específico
router.post('/product/:productId', uploadMultiple, processImage, async (req, res) => {
  try {
    const { productId } = req.params;

    // Verificar se o produto existe
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }

    if (!req.processedImages || req.processedImages.length === 0) {
      return res.status(400).json({
        error: 'Nenhuma imagem processada encontrada'
      });
    }

    // Gerar nomes únicos para cada imagem do produto
    const imagesWithFilenames = req.processedImages.map(image => ({
      ...image,
      filename: generateUniqueFilename(image.originalname, productId)
    }));

    const uploadResults = await uploadMultipleImages(
      imagesWithFilenames,
      `products/${productId}`
    );

    // Atualizar o produto com as novas URLs das imagens
    const imageUrls = uploadResults.map(result => result.publicUrl);
    
    // Buscar imagens existentes
    const { data: currentProduct } = await supabase
      .from('products')
      .select('images, image_url')
      .eq('id', productId)
      .single();

    const existingImages = currentProduct?.images || [];
    const updatedImages = [...existingImages, ...imageUrls];

    // Se não há imagem principal, definir a primeira como principal
    const updateData = {
      images: updatedImages
    };

    if (!currentProduct?.image_url && imageUrls.length > 0) {
      updateData.image_url = imageUrls[0];
    }

    const { error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId);

    if (updateError) {
      console.error('Erro ao atualizar produto:', updateError);
      return res.status(500).json({
        error: 'Erro ao atualizar produto com as imagens'
      });
    }

    res.json({
      message: `${uploadResults.length} imagens enviadas com sucesso para o produto ${product.name}`,
      productId: productId,
      images: uploadResults.map(result => ({
        filename: result.filename,
        url: result.publicUrl,
        path: result.path
      }))
    });
  } catch (error) {
    console.error('Erro no upload de imagens do produto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao fazer upload das imagens do produto'
    });
  }
});

// Deletar imagem específica
router.delete('/image', async (req, res) => {
  try {
    const { imagePath, productId } = req.body;

    if (!imagePath) {
      return res.status(400).json({
        error: 'Caminho da imagem é obrigatório'
      });
    }

    await deleteImage(imagePath);

    // Se for imagem de produto, remover da lista de imagens do produto
    if (productId) {
      const { data: product } = await supabase
        .from('products')
        .select('images, image_url')
        .eq('id', productId)
        .single();

      if (product) {
        const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/product-images/${imagePath}`;
        const updatedImages = (product.images || []).filter(url => !url.includes(imagePath));
        
        const updateData = { images: updatedImages };
        
        // Se a imagem deletada era a principal, definir nova imagem principal
        if (product.image_url && product.image_url.includes(imagePath)) {
          updateData.image_url = updatedImages.length > 0 ? updatedImages[0] : null;
        }

        await supabase
          .from('products')
          .update(updateData)
          .eq('id', productId);
      }
    }

    res.json({
      message: 'Imagem deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao deletar imagem'
    });
  }
});

// Deletar múltiplas imagens
router.delete('/images', async (req, res) => {
  try {
    const { imagePaths, productId } = req.body;

    if (!imagePaths || !Array.isArray(imagePaths) || imagePaths.length === 0) {
      return res.status(400).json({
        error: 'Lista de caminhos das imagens é obrigatória'
      });
    }

    await deleteMultipleImages(imagePaths);

    // Se for imagens de produto, remover da lista de imagens do produto
    if (productId) {
      const { data: product } = await supabase
        .from('products')
        .select('images, image_url')
        .eq('id', productId)
        .single();

      if (product) {
        const updatedImages = (product.images || []).filter(url => 
          !imagePaths.some(path => url.includes(path))
        );
        
        const updateData = { images: updatedImages };
        
        // Se a imagem principal foi deletada, definir nova imagem principal
        if (product.image_url && imagePaths.some(path => product.image_url.includes(path))) {
          updateData.image_url = updatedImages.length > 0 ? updatedImages[0] : null;
        }

        await supabase
          .from('products')
          .update(updateData)
          .eq('id', productId);
      }
    }

    res.json({
      message: `${imagePaths.length} imagens deletadas com sucesso`
    });
  } catch (error) {
    console.error('Erro ao deletar múltiplas imagens:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao deletar imagens'
    });
  }
});

module.exports = router;

