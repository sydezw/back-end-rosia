const express = require('express');
const router = express.Router();
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
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
const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * POST /admin/auth/login
 * Login específico para administradores usando apenas email
 */
router.post('/auth/login', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email é obrigatório'
      });
    }

    // Verificar se o email existe na tabela admin_users
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, user_id, active')
      .eq('email', email)
      .eq('active', true)
      .single();

    if (adminError || !adminCheck) {
      return res.status(403).json({
        error: 'Acesso negado. Email não encontrado ou usuário inativo.',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Buscar dados do usuário no Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(adminCheck.user_id);
    
    if (userError || !userData.user) {
      return res.status(404).json({
        error: 'Usuário não encontrado no sistema de autenticação',
        code: 'USER_NOT_FOUND'
      });
    }

    // Gerar um token simples para a sessão admin (você pode usar JWT aqui se preferir)
    const adminToken = Buffer.from(`${adminCheck.id}:${adminCheck.email}:${Date.now()}`).toString('base64');

    res.json({
      success: true,
      admin_token: adminToken,
      user: {
        id: adminCheck.user_id,
        email: adminCheck.email,
        name: userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || 'Admin',
        role: "admin",
        permissions: ["products.create", "products.read", "products.update", "products.delete", "orders.read", "orders.update", "dashboard.read"],
        avatar: userData.user.user_metadata?.avatar_url || null,
        created_at: userData.user.created_at
      },
      session: {
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
      }
    });

  } catch (error) {
    next(error);
  }
});

// Middleware de autenticação para todas as outras rotas administrativas
router.use(authenticateAdmin);

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
        totalPages: Math.ceil(count / limit)
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

// ==================== ROTAS ADMINISTRATIVAS DE PEDIDOS ====================

// Listar todos os pedidos (para administração)
router.get('/orders', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search, 
      sortBy = 'created_at', 
      order = 'desc',
      startDate,
      endDate,
      minValue,
      maxValue
    } = req.query;
    
    let query = supabase
      .from('orders')
      .select(`
        *,
        user:user_id (
          email
        )
      `, { count: 'exact' });

    // Filtros
    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      // Buscar por ID do pedido ou email do usuário
      query = query.or(`id.ilike.%${search}%`);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (minValue) {
      query = query.gte('total', parseFloat(minValue));
    }

    if (maxValue) {
      query = query.lte('total', parseFloat(maxValue));
    }

    // Ordenação
    query = query.order(sortBy, { ascending: order === 'asc' });

    // Paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar pedidos:', error);
      return res.status(500).json({
        error: 'Erro ao buscar pedidos'
      });
    }

    // Formatar resposta
    const formattedOrders = orders.map(order => ({
      id: order.id,
      user_email: order.user?.email || 'N/A',
      total: order.total,
      status: order.status,
      payment_method: order.payment_method,
      items_count: order.items ? order.items.length : 0,
      created_at: order.created_at,
      updated_at: order.updated_at,
      shipping_address: order.shipping_address,
      tracking_code: order.tracking_code
    }));

    res.json({
      orders: formattedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao listar pedidos'
    });
  }
});

// Obter detalhes de um pedido específico (para administração)
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        user:user_id (
          email,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return res.status(404).json({
        error: 'Pedido não encontrado'
      });
    }

    res.json({ order });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao buscar pedido'
    });
  }
});

// Atualizar status de um pedido
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_code, estimated_delivery } = req.body;

    // Validar status
    const validStatuses = ['pendente', 'processando', 'enviado', 'entregue', 'cancelado'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Status inválido',
        valid_statuses: validStatuses
      });
    }

    // Buscar pedido atual
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentOrder) {
      return res.status(404).json({
        error: 'Pedido não encontrado'
      });
    }

    // Preparar dados de atualização
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (tracking_code) {
      updateData.tracking_code = tracking_code;
    }

    if (estimated_delivery) {
      updateData.estimated_delivery = estimated_delivery;
    }

    // Se cancelando pedido, restaurar estoque
    if (status === 'cancelado' && currentOrder.status !== 'cancelado') {
      if (currentOrder.items && Array.isArray(currentOrder.items)) {
        for (const item of currentOrder.items) {
          if (item.product_id && item.quantity) {
            const { data: product, error: productError } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .single();

            if (!productError && product) {
              await supabase
                .from('products')
                .update({ stock: product.stock + item.quantity })
                .eq('id', item.product_id);
            }
          }
        }
      }
    }

    // Atualizar pedido
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar pedido:', updateError);
      return res.status(500).json({
        error: 'Erro ao atualizar pedido'
      });
    }

    res.json({
      message: 'Status do pedido atualizado com sucesso',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao atualizar pedido'
    });
  }
});

// Obter estatísticas do dashboard
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Buscar estatísticas usando a view criada no SQL
    const { data: stats, error: statsError } = await supabase
      .from('admin_stats')
      .select('*')
      .single();

    if (statsError) {
      console.error('Erro ao buscar estatísticas:', statsError);
      // Fallback: calcular estatísticas manualmente
      const [productsResult, ordersResult, salesResult] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total').eq('status', 'entregue')
      ]);

      const totalSales = salesResult.data?.reduce((sum, order) => sum + order.total, 0) || 0;

      return res.json({
        produtos_ativos: productsResult.count || 0,
        pedidos_pendentes: 0,
        vendas_totais: totalSales,
        total_usuarios: 0
      });
    }

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao buscar estatísticas'
    });
  }
});

// Obter vendas por período
router.get('/dashboard/sales', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate;
    const endDate = new Date();
    
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const { data: sales, error } = await supabase
      .from('orders')
      .select('total, created_at')
      .eq('status', 'entregue')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar vendas:', error);
      return res.status(500).json({
        error: 'Erro ao buscar dados de vendas'
      });
    }

    // Agrupar vendas por dia
    const salesByDay = {};
    sales.forEach(sale => {
      const date = new Date(sale.created_at).toISOString().split('T')[0];
      salesByDay[date] = (salesByDay[date] || 0) + sale.total;
    });

    res.json({
      period,
      sales: salesByDay,
      total: sales.reduce((sum, sale) => sum + sale.total, 0),
      count: sales.length
    });
  } catch (error) {
    console.error('Erro ao buscar vendas por período:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao buscar vendas'
    });
  }
});

module.exports = router;