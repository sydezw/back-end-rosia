const express = require('express');
const router = express.Router();
const axios = require('axios');
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

// Verificar token admin
router.get('/auth/verify', async (req, res) => {
  try {
    res.json({
      valid: !!req.isAdmin,
      admin_id: req.adminId || null,
      user_id: req.userId || null,
      email: req.userEmail || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

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
        profile:user_id (
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

    const formattedOrders = orders.map(order => ({
      id: order.id,
      user_email: (order.profile && order.profile.email) ? order.profile.email : 'N/A',
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
        profile:user_id (
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

    const userEmail = order && order.profile ? order.profile.email || null : null;

    res.json({ order: { ...order, user_email: userEmail } });
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

function buildSender() {
  return {
    name: process.env.SENDER_NAME || null,
    document: process.env.SENDER_DOCUMENT || null,
    email: process.env.SENDER_EMAIL || null,
    phone: process.env.SENDER_PHONE || null,
    company: process.env.SENDER_COMPANY || null,
    street: process.env.SENDER_STREET || null,
    number: process.env.SENDER_NUMBER || null,
    complement: process.env.SENDER_COMPLEMENT || null,
    neighborhood: process.env.SENDER_NEIGHBORHOOD || null,
    city: process.env.SENDER_CITY || null,
    state: process.env.SENDER_STATE || null,
    postal_code: process.env.SENDER_POSTAL_CODE || null,
    country: process.env.SENDER_COUNTRY || 'BR'
  };
}

function buildVolumes(items, overrideVolumes) {
  function normalizeWeightKg(raw) {
    let w = Number(raw);
    if (!Number.isFinite(w) || w <= 0) {
      throw new Error('Peso inválido');
    }
    // Se aparentemente veio em gramas (ex.: 500 -> 0.5kg), converter
    if (w >= 100) {
      w = w / 1000;
    }
    // Limite de segurança: rejeitar pesos acima de 50kg
    if (w > 50) {
      throw new Error('Peso acima do limite permitido');
    }
    return Number(w.toFixed(3));
  }

  if (Array.isArray(overrideVolumes) && overrideVolumes.length > 0) {
    return overrideVolumes.map(v => {
      const height = Number(v.height);
      const width = Number(v.width);
      const length = Number(v.length);
      const weight = normalizeWeightKg(v.weight);
      if (!Number.isFinite(height) || !Number.isFinite(width) || !Number.isFinite(length)) {
        throw new Error('Dimensões inválidas');
      }
      if (height <= 0 || width <= 0 || length <= 0) {
        throw new Error('Dimensões devem ser positivas');
      }
      return { height, width, length, weight };
    });
  }
  const height = Number(process.env.DEFAULT_PACKAGE_HEIGHT || 5);
  const width = Number(process.env.DEFAULT_PACKAGE_WIDTH || 15);
  const length = Number(process.env.DEFAULT_PACKAGE_LENGTH || 20);
  const weight = normalizeWeightKg(process.env.DEFAULT_PACKAGE_WEIGHT || 0.5);
  return [{ height, width, length, weight }];
}

router.post('/gerar-envio/:orderId', async (req, res) => {
  try {
    if (!process.env.MELHOR_ENVIO_TOKEN) {
      return res.status(500).json({ error: 'Token do Melhor Envio não configurado' });
    }

    const { orderId } = req.params;
    const { service, volumes, options } = req.body;

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, items, shipping_address, subtotal, total, shipping_cost, status, user_id, google_user_profile_id, user_info')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    let profile = null;
    if (order.google_user_profile_id) {
      const { data: gp } = await supabaseAdmin
        .from('google_user_profiles')
        .select('nome, cpf, data_nascimento')
        .eq('id', order.google_user_profile_id)
        .maybeSingle();
      profile = gp || null;
    }
    if (!profile && order.user_id) {
      const { data: up } = await supabaseAdmin
        .from('user_profiles')
        .select('name, cpf, birth_date, email, phone')
        .eq('user_id', order.user_id)
        .maybeSingle();
      profile = up || null;
    }

    const addr = order.shipping_address || {};
    const sender = buildSender();

    const recipient = {
      name: profile?.nome || profile?.name || order.user_info?.name || 'Cliente',
      document: profile?.cpf || order.user_info?.cpf || null,
      email: profile?.email || order.user_info?.email || null,
      phone: profile?.phone || order.user_info?.phone || null,
      company: null,
      birth_date: profile?.data_nascimento || profile?.birth_date || null,
      street: addr.logradouro || null,
      number: String(addr.numero || ''),
      complement: addr.complemento || null,
      neighborhood: addr.bairro || null,
      city: addr.cidade || null,
      state: addr.estado || null,
      postal_code: addr.cep || null,
      country: 'BR'
    };

    const senderRequired = [sender.name, sender.postal_code, sender.street, sender.number, sender.city, sender.state, sender.country];
    if (senderRequired.some(v => !v)) {
      return res.status(400).json({ error: 'Dados de remetente incompletos' });
    }

    const vols = buildVolumes(order.items || [], volumes);
    const insurance_value = typeof (options?.insurance_value) === 'number' ? options.insurance_value : (order.total ? Number(order.total) : null);

    const { data: newShipment, error: insErr } = await supabaseAdmin
      .from('melhor_envio_shipments')
      .insert({
        order_id: order.id,
        cart_item_id: null,
        service: Number(service) || 1,
        status: 'cart',
        sender_name: sender.name,
        sender_document: sender.document,
        sender_email: sender.email,
        sender_phone: sender.phone,
        sender_company: sender.company,
        sender_street: sender.street,
        sender_number: sender.number,
        sender_complement: sender.complement,
        sender_neighborhood: sender.neighborhood,
        sender_city: sender.city,
        sender_state: sender.state,
        sender_postal_code: sender.postal_code,
        sender_country: sender.country,
        recipient_name: recipient.name,
        recipient_document: recipient.document,
        recipient_email: recipient.email,
        recipient_phone: recipient.phone,
        recipient_company: recipient.company,
        recipient_birth_date: recipient.birth_date || null,
        recipient_street: recipient.street,
        recipient_number: recipient.number,
        recipient_complement: recipient.complement,
        recipient_neighborhood: recipient.neighborhood,
        recipient_city: recipient.city,
        recipient_state: recipient.state,
        recipient_postal_code: recipient.postal_code,
        recipient_country: recipient.country,
        volumes: vols,
        options: options || null,
        insurance_value: insurance_value
      })
      .select()
      .single();

    if (insErr) {
      return res.status(500).json({ error: 'Erro ao preparar envio' });
    }

    const meHeaders = {
      Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    const baseUrl = process.env.MELHOR_ENVIO_API_URL || 'https://melhorenvio.com.br/api/v2';

    const cartPayload = {
      service: Number(service) || 1,
      from: {
        name: sender.name,
        postal_code: sender.postal_code,
        address: sender.street,
        number: sender.number,
        complement: sender.complement,
        city: sender.city,
        state: sender.state,
        country: sender.country,
        email: sender.email,
        document: sender.document,
        phone: sender.phone
      },
      to: {
        name: recipient.name,
        postal_code: recipient.postal_code,
        address: recipient.street,
        number: recipient.number,
        complement: recipient.complement,
        city: recipient.city,
        state: recipient.state,
        country: recipient.country,
        email: recipient.email,
        document: recipient.document,
        phone: recipient.phone
      },
      volumes: vols,
      options: { insurance_value }
    };

    // Verificar saldo antes de adicionar ao carrinho
    const balRes = await axios.get(`${baseUrl}/me/balance`, { headers: meHeaders });
    function getAvailableBalance(b) {
      if (b == null) return 0;
      if (typeof b === 'number') return b;
      if (typeof b === 'object') {
        return Number(b.available || b.balance || b.amount || b.credit || 0);
      }
      return Number(b) || 0;
    }
    const available = getAvailableBalance(balRes?.data);
    const expectedShipping = (order.shipping_cost && Number(order.shipping_cost) > 0)
      ? Number(order.shipping_cost)
      : Number(process.env.DEFAULT_MIN_SHIPPING || 10);
    if (available < expectedShipping) {
      return res.status(402).json({ error: 'Saldo insuficiente no Melhor Envio. Recarregue para prosseguir.' });
    }

    const cartRes = await axios.post(`${baseUrl}/me/cart`, cartPayload, { headers: meHeaders });
    const itemId = cartRes?.data?.id || (Array.isArray(cartRes?.data) ? cartRes.data[0]?.id : null) || null;

    await supabaseAdmin
      .from('melhor_envio_shipments')
      .update({ cart_item_id: itemId, status: 'cart' })
      .eq('id', newShipment.id);

    await axios.post(`${baseUrl}/me/shipment/checkout`, { orders: [itemId] }, { headers: meHeaders });
    await supabaseAdmin
      .from('melhor_envio_shipments')
      .update({ status: 'paid', payment_status: 'paid' })
      .eq('id', newShipment.id);

    const genRes = await axios.post(`${baseUrl}/me/shipment/generate`, { orders: [itemId] }, { headers: meHeaders });
    let trackingCode = null;
    let labelUrl = null;
    const ordersResp = genRes?.data?.orders || (Array.isArray(genRes?.data) ? genRes.data : []);
    if (Array.isArray(ordersResp) && ordersResp.length > 0) {
      trackingCode = ordersResp[0]?.tracking || null;
      labelUrl = ordersResp[0]?.label?.url || null;
    } else {
      trackingCode = genRes?.data?.tracking || null;
      labelUrl = genRes?.data?.label?.url || null;
    }

    await supabaseAdmin
      .from('melhor_envio_shipments')
      .update({ status: 'generated', tracking_code: trackingCode, label_url: labelUrl })
      .eq('id', newShipment.id);

    if (trackingCode) {
      await supabaseAdmin
        .from('orders')
        .update({ tracking_code: trackingCode, status: 'processando' })
        .eq('id', order.id);
    }

    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('id, quantity')
      .eq('order_id', order.id);

    if (Array.isArray(orderItems) && orderItems.length > 0) {
      const links = orderItems.map(oi => ({ shipment_id: newShipment.id, order_item_id: oi.id, quantity: oi.quantity }));
      await supabaseAdmin.from('melhor_envio_shipment_items').insert(links);
    }

    return res.json({ success: true, shipment_id: newShipment.id, cart_item_id: itemId, tracking_code: trackingCode, label_url: labelUrl });
  } catch (err) {
    try {
      const lastShipmentId = req?.params?.orderId ? (await supabaseAdmin
        .from('melhor_envio_shipments')
        .select('id')
        .eq('order_id', req.params.orderId)
        .order('created_at', { ascending: false })
        .limit(1))?.data?.[0]?.id : null;
      if (lastShipmentId) {
        await supabaseAdmin
          .from('melhor_envio_shipments')
          .update({ status: 'error', error: err?.response?.data || { message: err.message } })
          .eq('id', lastShipmentId);
      }
    } catch (_) {}
    if (err?.response?.data) {
      return res.status(500).json({ error: err.response.data });
    }
    return res.status(500).json({ error: err.message });
  }
});

router.get('/pedido/:orderId/status-frete', async (req, res) => {
  try {
    if (!process.env.MELHOR_ENVIO_TOKEN) {
      return res.status(500).json({ error: 'Token do Melhor Envio não configurado' });
    }

    const { orderId } = req.params;
    const { data: shipments, error: shipErr } = await supabaseAdmin
      .from('melhor_envio_shipments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (shipErr || !shipments || shipments.length === 0) {
      return res.status(404).json({ error: 'Envio não encontrado para este pedido' });
    }
    const shipment = shipments[0];

    if (shipment.tracking_code) {
      return res.json({
        status: shipment.status,
        tracking_code: shipment.tracking_code,
        label_url: shipment.label_url,
        shipment_id: shipment.id
      });
    }

    const meHeaders = {
      Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    const baseUrl = process.env.MELHOR_ENVIO_API_URL || 'https://melhorenvio.com.br/api/v2';

    const searchParams = {};
    if (shipment.cart_item_id) {
      searchParams.orders = [shipment.cart_item_id];
    }

    const resp = await axios.get(`${baseUrl}/me/shipment/search`, { headers: meHeaders, params: searchParams });
    const ordersResp = resp?.data?.orders || (Array.isArray(resp?.data) ? resp.data : []);
    let trackingCode = null;
    let labelUrl = null;
    if (Array.isArray(ordersResp)) {
      const found = ordersResp.find(o => (o?.id && shipment.cart_item_id && String(o.id) === String(shipment.cart_item_id)) || (o?.tracking && o.tracking));
      if (found) {
        trackingCode = found.tracking || null;
        labelUrl = found.label?.url || null;
      }
    }

    if (trackingCode) {
      await supabaseAdmin
        .from('melhor_envio_shipments')
        .update({ tracking_code: trackingCode, label_url: labelUrl, status: shipment.status === 'paid' ? 'generated' : shipment.status })
        .eq('id', shipment.id);

      await supabaseAdmin
        .from('orders')
        .update({ tracking_code: trackingCode })
        .eq('id', orderId);

      return res.json({
        status: 'generated',
        tracking_code: trackingCode,
        label_url: labelUrl,
        shipment_id: shipment.id
      });
    }

    return res.json({
      status: shipment.status,
      tracking_code: null,
      label_url: null,
      shipment_id: shipment.id,
      message: 'Rastreio ainda não disponível'
    });
  } catch (error) {
    return res.status(500).json({ error: error?.response?.data || error.message });
  }
});

module.exports = router;

