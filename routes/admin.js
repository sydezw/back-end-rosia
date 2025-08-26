const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  uploadMultiple,
  processImage,
  validateProductData
} = require('../middleware/imageValidation');
const {
  uploadMultipleImages,
  deleteMultipleImages,
  generateUniqueFilename
} = require('../config/storage');
const { supabase } = require('../config/supabase');

// Middleware de autenticação para todas as rotas administrativas
router.use(authenticateUser);

// Criar novo produto com imagens
router.post('/products', uploadMultiple, validateProductData, processImage, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      category,
      colors,
      sizes,
      material,
      brand,
      weight,
      volume,
      tags
    } = req.body;

    // Criar o produto primeiro
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        stock: parseInt(stock),
        category: category.trim(),
        colors: colors || [],
        sizes: sizes || [],
        material: material?.trim() || null,
        brand: brand?.trim() || null,
        weight: weight ? parseFloat(weight) : null,
        volume: volume ? parseFloat(volume) : null,
        tags: tags || []
      })
      .select()
      .single();

    if (productError) {
      console.error('Erro ao criar produto:', productError);
      return res.status(500).json({
        error: 'Erro ao criar produto no banco de dados'
      });
    }

    let imageUrls = [];
    let mainImageUrl = null;

    // Se há imagens para upload
    if (req.processedImages && req.processedImages.length > 0) {
      try {
        // Gerar nomes únicos para cada imagem do produto
        const imagesWithFilenames = req.processedImages.map(image => ({
          ...image,
          filename: generateUniqueFilename(image.originalname, product.id)
        }));

        const uploadResults = await uploadMultipleImages(
          imagesWithFilenames,
          `products/${product.id}`
        );

        imageUrls = uploadResults.map(result => result.publicUrl);
        mainImageUrl = imageUrls[0]; // Primeira imagem como principal

        // Atualizar produto com as URLs das imagens
        const { error: updateError } = await supabase
          .from('products')
          .update({
            image_url: mainImageUrl,
            images: imageUrls
          })
          .eq('id', product.id);

        if (updateError) {
          console.error('Erro ao atualizar produto com imagens:', updateError);
          // Não retornar erro aqui, pois o produto já foi criado
        }
      } catch (uploadError) {
        console.error('Erro no upload das imagens:', uploadError);
        // Produto foi criado, mas imagens falharam
        return res.status(201).json({
          message: 'Produto criado com sucesso, mas houve erro no upload das imagens',
          product: {
            ...product,
            image_url: null,
            images: []
          },
          uploadError: 'Erro no upload das imagens'
        });
      }
    }

    res.status(201).json({
      message: 'Produto criado com sucesso',
      product: {
        ...product,
        image_url: mainImageUrl,
        images: imageUrls
      }
    });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao criar produto'
    });
  }
});

// Atualizar produto existente
router.put('/products/:id', uploadMultiple, validateProductData, processImage, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      stock,
      category,
      colors,
      sizes,
      material,
      brand,
      weight,
      volume,
      tags,
      removeImages // Array de URLs de imagens para remover
    } = req.body;

    // Verificar se o produto existe
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }

    // Preparar dados para atualização
    const updateData = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      stock: parseInt(stock),
      category: category.trim(),
      colors: colors || [],
      sizes: sizes || [],
      material: material?.trim() || null,
      brand: brand?.trim() || null,
      weight: weight ? parseFloat(weight) : null,
      volume: volume ? parseFloat(volume) : null,
      tags: tags || []
    };

    let currentImages = existingProduct.images || [];
    let mainImageUrl = existingProduct.image_url;

    // Remover imagens se solicitado
    if (removeImages && Array.isArray(removeImages) && removeImages.length > 0) {
      try {
        // Extrair paths das URLs para deletar do storage
        const imagePaths = removeImages.map(url => {
          const urlParts = url.split('/product-images/');
          return urlParts.length > 1 ? urlParts[1] : null;
        }).filter(Boolean);

        if (imagePaths.length > 0) {
          await deleteMultipleImages(imagePaths);
        }

        // Remover URLs da lista de imagens
        currentImages = currentImages.filter(url => !removeImages.includes(url));

        // Se a imagem principal foi removida, definir nova
        if (removeImages.includes(mainImageUrl)) {
          mainImageUrl = currentImages.length > 0 ? currentImages[0] : null;
        }
      } catch (deleteError) {
        console.error('Erro ao deletar imagens:', deleteError);
        // Continuar com a atualização mesmo se a deleção falhar
      }
    }

    // Adicionar novas imagens se fornecidas
    if (req.processedImages && req.processedImages.length > 0) {
      try {
        const imagesWithFilenames = req.processedImages.map(image => ({
          ...image,
          filename: generateUniqueFilename(image.originalname, id)
        }));

        const uploadResults = await uploadMultipleImages(
          imagesWithFilenames,
          `products/${id}`
        );

        const newImageUrls = uploadResults.map(result => result.publicUrl);
        currentImages = [...currentImages, ...newImageUrls];

        // Se não há imagem principal, definir a primeira nova como principal
        if (!mainImageUrl && newImageUrls.length > 0) {
          mainImageUrl = newImageUrls[0];
        }
      } catch (uploadError) {
        console.error('Erro no upload das novas imagens:', uploadError);
        // Continuar com a atualização mesmo se o upload falhar
      }
    }

    // Atualizar dados do produto
    updateData.images = currentImages;
    updateData.image_url = mainImageUrl;

    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar produto:', updateError);
      return res.status(500).json({
        error: 'Erro ao atualizar produto no banco de dados'
      });
    }

    res.json({
      message: 'Produto atualizado com sucesso',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao atualizar produto'
    });
  }
});

// Deletar produto
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar produto para obter imagens
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('images')
      .eq('id', id)
      .single();

    if (fetchError || !product) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }

    // Deletar imagens do storage se existirem
    if (product.images && product.images.length > 0) {
      try {
        const imagePaths = product.images.map(url => {
          const urlParts = url.split('/product-images/');
          return urlParts.length > 1 ? urlParts[1] : null;
        }).filter(Boolean);

        if (imagePaths.length > 0) {
          await deleteMultipleImages(imagePaths);
        }
      } catch (deleteError) {
        console.error('Erro ao deletar imagens do produto:', deleteError);
        // Continuar com a deleção do produto mesmo se as imagens falharem
      }
    }

    // Deletar produto do banco
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao deletar produto:', deleteError);
      return res.status(500).json({
        error: 'Erro ao deletar produto do banco de dados'
      });
    }

    res.json({
      message: 'Produto deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao deletar produto'
    });
  }
});

// Listar todos os produtos (para administração)
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, sortBy = 'created_at', order = 'desc' } = req.query;
    
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });

    // Filtros
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Ordenação
    query = query.order(sortBy, { ascending: order === 'asc' });

    // Paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: products, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar produtos:', error);
      return res.status(500).json({
        error: 'Erro ao buscar produtos'
      });
    }

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao listar produtos'
    });
  }
});

// Obter produto específico (para administração)
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }

    res.json({ product });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao buscar produto'
    });
  }
});

module.exports = router;