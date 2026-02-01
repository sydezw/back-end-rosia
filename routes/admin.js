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
const { logger } = require('../middleware/logger');
const shippingController = require('../controllers/shippingController');

/**
 * POST /admin/auth/login
 * Login de administrador com validação estrita de email e senha
 */
router.post('/auth/login', async (req, res, next) => {
  try {
    logger.debug('Admin login request received', { body: req.body });
    const { email, password, senha } = req.body;
    const providedPassword = password || senha;

    if (!email || !providedPassword) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, user_id, active')
      .eq('email', email)
      .eq('active', true)
      .single();

    if (adminError || !adminCheck) {
      logger.warn('Admin login - admin not found or inactive', { email });
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Validar senha como user_id armazenado na tabela admin_users
    const _match = String(providedPassword || '').trim() === String(adminCheck.user_id || '').trim();
    const _providedLen = String(providedPassword || '').trim().length;
    const _userIdLen = String(adminCheck.user_id || '').trim().length;
    logger.debug('Admin login - comparing senha with user_id', {
      match: _match,
      providedLen: _providedLen,
      userIdLen: _userIdLen
    });
    console.log('Admin login compare:', { match: _match, providedLen: _providedLen, userIdLen: _userIdLen });
    if (String(providedPassword || '').trim() !== String(adminCheck.user_id || '').trim()) {
      logger.warn('Admin login - user_id mismatch', { email });
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(adminCheck.user_id);

    const adminToken = Buffer.from(`${adminCheck.id}:${adminCheck.email}:${Date.now()}`).toString('base64');

    return res.status(200).json({
      success: true,
      admin_token: adminToken,
      user: {
        id: adminCheck.user_id,
        name: userData?.user?.user_metadata?.name || userData?.user?.user_metadata?.full_name || 'Admin',
        role: 'admin'
      },
      session: {
        expires_at: Date.now() + (24 * 60 * 60 * 1000)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// Endpoint de diagnóstico para comparar senha com user_id (temporário)
router.post('/auth/login/diagnose', async (req, res) => {
  try {
    const { email, password, senha } = req.body;
    const providedPassword = password || senha || '';
    const { data: adminCheck } = await supabaseAdmin
      .from('admin_users')
      .select('id,email,user_id,active')
      .eq('email', email)
      .eq('active', true)
      .single();
    const userId = adminCheck?.user_id || '';
    const match = String(providedPassword).trim() === String(userId).trim();
    return res.json({
      found: !!adminCheck,
      match,
      providedLen: String(providedPassword).trim().length,
      userIdLen: String(userId).trim().length
    });
  } catch (e) {
    return res.status(500).json({ error: 'diagnose_failed' });
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

router.post('/auth/logout', async (req, res) => {
  try {
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const { data: monthOrders } = await supabaseAdmin
      .from('orders')
      .select('id,total,created_at,payment_status')
      .gte('created_at', startOfMonth.toISOString())
      .lt('created_at', startOfNextMonth.toISOString());

  const chartMap = {};
  (monthOrders || []).forEach(o => {
    const status = String(o.payment_status || '').toLowerCase();
    if (status === 'approved') {
      const d = new Date(o.created_at);
      const dayStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      chartMap[dayStr] = Number((chartMap[dayStr] || 0)) + Number(o.total || 0);
    }
  });
  const revenue_chart = Object.keys(chartMap).sort().map(date => ({ date, revenue: Number(chartMap[date]) }));

  const [{ count: total_orders }, { count: total_products }, lowStockRes, approvedOrdersRes, recentOrdersRes, userProfilesCountRes, googleProfilesCountRes, recentUsersNormalRes, recentUsersGoogleRes] = await Promise.all([
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('product_variants').select('id').lte('stock', 3),
      supabaseAdmin.from('orders').select('total,payment_status'),
      supabaseAdmin.from('orders').select('id,total,status,created_at').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('google_user_profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('user_profiles').select('id,email,nome,created_at').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('google_user_profiles').select('id,email,nome,created_at').order('created_at', { ascending: false }).limit(10)
    ]);

  const total_revenue = (Array.isArray(approvedOrdersRes?.data) ? approvedOrdersRes.data : []).reduce((s, o) => {
    const status = String(o.payment_status || '').toLowerCase();
    if (status === 'approved') return s + Number(o.total || 0);
    return s;
  }, 0);
    const low_stock_products = Array.isArray(lowStockRes?.data) ? lowStockRes.data.length : 0;
    const total_users = (userProfilesCountRes?.count || 0) + (googleProfilesCountRes?.count || 0);

    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const orders_today = (Array.isArray(monthOrders) ? monthOrders : []).filter(o => {
      const d = new Date(o.created_at);
      return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === todayStr;
    }).length;

    const recent_users_all = [
      ...(Array.isArray(recentUsersNormalRes?.data) ? recentUsersNormalRes.data.map(u => ({ id: u.id, email: u.email || null, name: u.nome || null, created_at: u.created_at, provider: 'local' })) : []),
      ...(Array.isArray(recentUsersGoogleRes?.data) ? recentUsersGoogleRes.data.map(u => ({ id: u.id, email: u.email || null, name: u.nome || null, created_at: u.created_at, provider: 'google' })) : [])
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

    const recent_orders = (Array.isArray(recentOrdersRes?.data) ? recentOrdersRes.data : []).map(o => ({ id: o.id, total: o.total, status: o.status, created_at: o.created_at }));

    const { data: itemsData } = await supabaseAdmin
      .from('order_items')
      .select('product_name,quantity')
      .limit(10000);
    const topMap = {};
    (itemsData || []).forEach(it => {
      const name = it.product_name || 'Item';
      const qty = Number(it.quantity || 0);
      topMap[name] = (topMap[name] || 0) + qty;
    });
    let top_products = Object.keys(topMap).map(name => ({ name, count: topMap[name] }));
    top_products.sort((a, b) => b.count - a.count);
    top_products = top_products.slice(0, 10);

    const new_users_today = recent_users_all.filter(u => new Date(u.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === todayStr).length;

    const { count: pending_orders_count } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['processing','pending','pendente','aguardando']);

    res.json({
      success: true,
      data: {
        stats: {
          total_users,
          total_orders: total_orders || 0,
          total_products: total_products || 0,
          total_revenue,
          pending_orders: pending_orders_count || 0,
          low_stock_products,
          new_users_today,
          orders_today
        },
        revenue_chart,
        top_products,
        recent_orders,
        recent_users: recent_users_all
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao gerar dashboard' });
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

    const includeDebug = String(req.query.debug || '').toLowerCase() === 'true';

    const orderIds = Array.isArray(orders) ? orders.map(o => o.id) : [];
    let itemsMap = {};
    if (orderIds.length > 0) {
      const { data: orderItemsData } = await supabaseAdmin
        .from('order_items')
        .select('order_id, product_name, unit_price, quantity')
        .in('order_id', orderIds);
      if (Array.isArray(orderItemsData)) {
        for (const oi of orderItemsData) {
          const key = oi.order_id;
          if (!itemsMap[key]) itemsMap[key] = [];
          itemsMap[key].push({
            name: oi.product_name || 'Produto',
            quantity: Number(oi.quantity) || 1,
            unitary_value: Number(oi.unit_price) || 0
          });
        }
      }
    }
    const formattedOrders = orders.map(order => {
      let products = itemsMap[order.id] || [];
      if ((!Array.isArray(products) || products.length === 0) && Array.isArray(order.items)) {
        products = order.items.map(it => {
          const qty = Number(it.quantity) || 1;
          const unit = it.product_price != null ? Number(it.product_price) : (it.total != null ? Number(it.total) / qty : 0);
          return { name: it.product_name || it.name || 'Produto', quantity: qty, unitary_value: Number(unit) };
        }).filter(p => p.quantity > 0 && p.unitary_value > 0);
      }
      const computed = {
        name: order.user_info?.nome || order.shipping_address?.name || null,
        cpf: order.user_info?.cpf || null,
        email: (order.profile && order.profile.email) ? order.profile.email : order.user_info?.email || null,
        phone: order.user_info?.telefone || order.shipping_address?.phone || null,
        address: order.shipping_address?.logradouro || order.shipping_address?.address || null,
        number: order.shipping_address?.numero || order.shipping_address?.number || null,
        district: order.shipping_address?.bairro || order.shipping_address?.district || null,
        city: order.shipping_address?.cidade || order.shipping_address?.city || null,
        state_abbr: order.shipping_address?.estado || order.shipping_address?.state_abbr || null,
        postal_code: order.shipping_address?.cep || order.shipping_address?.postal_code || null
      };

      const base = {
        id: order.id,
        order_id: order.id,
        name: computed.name || 'N/A',
        cpf: computed.cpf || 'N/A',
        email: computed.email || 'N/A',
        phone: computed.phone || 'N/A',
        address: computed.address || 'N/A',
        number: computed.number || 'N/A',
        district: computed.district || 'N/A',
        city: computed.city || 'N/A',
        state_abbr: computed.state_abbr || 'N/A',
        postal_code: computed.postal_code || 'N/A',
        total: order.total,
        status: order.status,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        items_count: Array.isArray(products) ? products.length : (order.items ? order.items.length : 0),
        products,
        created_at: order.created_at,
        updated_at: order.updated_at,
        shipping_address: order.shipping_address,
        tracking_code: order.tracking_code
      };

      return includeDebug ? {
        ...base,
        debug: {
          raw_user_info: order.user_info || null,
          raw_shipping_address: order.shipping_address || null,
          profile: order.profile || null,
          computed
        }
      } : base;
    });

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
    const { data: currentOrder, error: fetchError } = await supabaseAdmin
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
            const { data: product, error: productError } = await supabaseAdmin
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .single();

            if (!productError && product) {
              await supabaseAdmin
                .from('products')
                .update({ stock: product.stock + item.quantity })
                .eq('id', item.product_id);
            }
          }
        }
      }
    }

    // Atualizar pedido
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
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

    try {
      const notesValue = tracking_code || req.body?.notes || null;
      await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: id,
          status,
          notes: notesValue,
          current_total: currentOrder.total || null,
          current_items: Array.isArray(currentOrder.items) ? currentOrder.items : null,
          source: 'manual'
        });
    } catch (_) {}

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
    name: process.env.SENDER_NAME || 'Melissa Marques de Santana',
    document: process.env.SENDER_DOCUMENT || '51022073850',
    email: process.env.SENDER_EMAIL || 'rosia_oficial@outlook.com',
    phone: process.env.SENDER_PHONE || '11945549955',
    company: process.env.SENDER_COMPANY || null,
    street: process.env.SENDER_STREET || 'Rua Tapiramuta',
    number: process.env.SENDER_NUMBER || '41',
    complement: process.env.SENDER_COMPLEMENT || null,
    neighborhood: process.env.SENDER_NEIGHBORHOOD || 'Vila Nova Bonsucesso',
    city: process.env.SENDER_CITY || 'Guarulhos',
    state: process.env.SENDER_STATE || 'SP',
    postal_code: process.env.SENDER_POSTAL_CODE || '07175530',
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
    const rawToken = process.env.MELHOR_ENVIO_TOKEN || process.env.MELHOR_ENVIO_SECRET || '';
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!token) {
      return res.status(500).json({ error: 'Token do Melhor Envio não configurado' });
    }

    const { orderId } = req.params;
    const { service, service_id, volumes, package: pkg, options, products: productsInput, receiver } = req.body;
    console.log('ID RECEBIDO NO BACKEND:', Number(service_id ?? service));

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, items, shipping_address, subtotal, total, shipping_cost, status, user_id, google_user_profile_id, user_info')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const { data: existingShipments } = await supabaseAdmin
      .from('melhor_envio_shipments')
      .select('id, status, tracking_code, label_url, me_shipment_id, cart_item_id')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (Array.isArray(existingShipments) && existingShipments.length > 0) {
      const s = existingShipments[0];
      const st = String(s.status || '').toLowerCase();
      const blocking = ['cart','released','paid','generated','pronto_para_envio','enviado','processando_me','aguardando'];
      const hasProgress = !!(s.tracking_code || s.label_url || s.me_shipment_id || s.cart_item_id) || blocking.includes(st);
      if (hasProgress) {
        return res.status(400).json({
          success: false,
          message: 'Já existe um envio gerado para este pedido. Verifique a aba de etiquetas.',
          shipment: {
            id: s.id,
            status: s.status,
            tracking_code: s.tracking_code || null,
            label_url: s.label_url || null,
            me_id: s.me_shipment_id || null
          }
        });
      }
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
    let sender = buildSender();
    sender = {
      ...sender,
      name: sender.name || 'Melissa Marques de Santana',
      document: sender.document || '51022073850',
      email: sender.email || 'rosia_oficial@outlook.com',
      phone: sender.phone || '11945549955',
      street: sender.street || 'Rua Tapiramuta',
      number: String(sender.number || '41'),
      neighborhood: sender.neighborhood || 'Vila Nova Bonsucesso',
      city: sender.city || 'Guarulhos',
      state: sender.state || 'SP',
      postal_code: sender.postal_code || '07175530',
      country: sender.country || 'BR'
    };

    let recipient = {
      name: profile?.nome || profile?.name || order.user_info?.nome || 'Cliente',
      document: profile?.cpf || order.user_info?.cpf || null,
      email: profile?.email || order.user_info?.email || null,
      phone: profile?.phone || order.user_info?.telefone || process.env.DEFAULT_RECIPIENT_PHONE || '11999999999',
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
    const receiverBody = receiver || req.body?.receiver || {};
    recipient = {
      ...recipient,
      name: receiverBody.name ?? recipient.name,
      document: receiverBody.cpf ?? receiverBody.document ?? recipient.document,
      email: receiverBody.email ?? recipient.email,
      phone: receiverBody.phone ?? recipient.phone,
      street: receiverBody.address ?? receiverBody.street ?? recipient.street,
      number: String(receiverBody.number ?? recipient.number ?? ''),
      complement: receiverBody.complement ?? recipient.complement,
      neighborhood: receiverBody.district ?? receiverBody.neighborhood ?? recipient.neighborhood,
      city: receiverBody.city ?? recipient.city,
      state: receiverBody.state_abbr ?? receiverBody.state ?? recipient.state,
      postal_code: receiverBody.postal_code ? String(receiverBody.postal_code) : recipient.postal_code,
      country: 'BR'
    };

    const senderRequired = [sender.name, sender.postal_code, sender.street, sender.number, sender.city, sender.state, sender.country];
    if (senderRequired.some(v => !v)) {
      console.log('❌ Sender incompleto:', sender);
      return res.status(400).json({ error: 'Dados de remetente incompletos' });
    }
    if (onlyDigits(sender.postal_code) === onlyDigits(recipient.postal_code)) {
      return res.status(422).json({ error: 'Origem e destino não podem ser iguais' });
    }

    const overrideVolumes = (Array.isArray(volumes) && volumes.length > 0)
      ? volumes
      : (pkg ? [pkg] : null);
    const vols = buildVolumes(order.items || [], overrideVolumes);
    let insurance_value = typeof (options?.insurance_value) === 'number'
      ? options.insurance_value
      : (typeof (pkg?.insurance_value) === 'number' ? pkg.insurance_value : (order.total ? Number(order.total) : null));

    const { data: newShipment, error: insErr } = await supabaseAdmin
      .from('melhor_envio_shipments')
      .insert({
        order_id: order.id,
        cart_item_id: null,
        service: Number(service_id ?? service) || 1,
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
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Rosia Backend (contato@rosia.com.br)'
    };
    const rawBaseUrlCalc = (process.env.MELHOR_ENVIO_API_URL || 'https://sandbox.melhorenvio.com.br/api/v2').trim().replace(/\/$/, '');
    const baseUrl = rawBaseUrlCalc.includes('/api/v2') ? rawBaseUrlCalc.replace(/\/api\/v2.*$/, '/api/v2') : `${rawBaseUrlCalc}/api/v2`;

    function normalizeMoney(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return 0;
      return Number(n.toFixed(2));
    }
    let productsPayload = [];
    if (Array.isArray(productsInput) && productsInput.length > 0) {
      productsPayload = productsInput.map(p => ({
        name: p.name || 'Produto Comercial',
        quantity: Number(p.quantity) || 1,
        unitary_value: normalizeMoney(p.unitary_value)
      })).filter(p => (p.quantity || 0) > 0 && (p.unitary_value || 0) > 0);
    } else {
      const { data: orderItemsData } = await supabaseAdmin
        .from('order_items')
        .select('product_name, unit_price, quantity')
        .eq('order_id', order.id);
      if (Array.isArray(orderItemsData) && orderItemsData.length > 0) {
        productsPayload = orderItemsData.map(oi => ({
          name: oi.product_name || 'Produto Comercial',
          quantity: Number(oi.quantity) || 1,
          unitary_value: normalizeMoney(oi.unit_price)
        })).filter(p => (p.quantity || 0) > 0 && (p.unitary_value || 0) > 0);
      } else if (Array.isArray(order.items) && order.items.length > 0) {
        productsPayload = order.items.map(it => {
          const qtyNum = Number(it.quantity) || 1;
          const unitNum = it.product_price != null
            ? normalizeMoney(it.product_price)
            : (it.total != null ? normalizeMoney(Number(it.total) / (qtyNum || 1)) : 0);
          const name = it.product_name || it.name || 'Produto Comercial';
          const quantity = qtyNum;
          const unitary_value = unitNum;
          return { name, quantity, unitary_value };
        }).filter(p => (p.quantity || 0) > 0 && (p.unitary_value || 0) > 0);
      }
    }
    if (!Array.isArray(productsPayload) || productsPayload.length === 0) {
      const tot = normalizeMoney(order.total || order.subtotal || 0);
      productsPayload = [{ name: `Pedido ${order.id}`, quantity: 1, unitary_value: tot }];
    }
    const cleanProducts = productsPayload.map(p => ({
      name: String(p.name || '').substring(0, 50),
      quantity: Number(p.quantity),
      unitary_value: Number(p.unitary_value)
    }));
    const declaredTotal = cleanProducts.reduce((sum, p) => sum + (Number(p.unitary_value) * Number(p.quantity)), 0);
    insurance_value = normalizeMoney(declaredTotal || insurance_value || 0);
    const finalVolumes = (Array.isArray(vols) ? vols : []).map(v => ({
      height: Number(v.height),
      width: Number(v.width),
      length: Number(v.length),
      weight: Number(v.weight)
    }));

    function onlyDigits(v) { return (v == null ? '' : String(v)).replace(/\D/g, ''); }
    const forcedFromPostal = onlyDigits(process.env.SANDBOX_FORCE_FROM_CEP || '');
    const forcedToPostal = onlyDigits(process.env.SANDBOX_FORCE_TO_CEP || '');
    console.log('📦 Sender usado no carrinho:', sender);
    const cartPayload = {
      service: Number(service_id ?? service) || Number(process.env.SANDBOX_DEFAULT_SERVICE || 3),
      from: {
        name: sender.name,
        postal_code: onlyDigits(sender.postal_code),
        address: sender.street,
        number: sender.number,
        complement: sender.complement,
        district: sender.neighborhood,
        city: sender.city,
        state_abbr: sender.state,
        country: sender.country,
        country_id: 'BR',
        email: sender.email,
        document: onlyDigits(sender.document),
        phone: onlyDigits(sender.phone)
      },
      to: {
        name: recipient.name,
        postal_code: onlyDigits(recipient.postal_code),
        address: recipient.street,
        number: recipient.number,
        complement: recipient.complement,
        district: recipient.neighborhood,
        city: recipient.city,
        state_abbr: recipient.state,
        country: recipient.country,
        country_id: 'BR',
        email: recipient.email,
        document: onlyDigits(recipient.document || ''),
        phone: onlyDigits(recipient.phone)
      },
      volumes: finalVolumes,
      products: cleanProducts.map(p => ({
        name: p.name,
        quantity: String(p.quantity),
        unitary_value: String(Number(p.unitary_value))
      })),
      options: { insurance_value: Number(insurance_value), non_commercial: true }
    };

    // Verificar saldo antes de adicionar ao carrinho
    const balRes = await axios.get(`${baseUrl}/me/balance`, { headers: { ...meHeaders, 'User-Agent': 'Rosia Backend (contato@rosia.com.br)' } });
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

    try {
      const quotePayload = { from: cartPayload.from, to: cartPayload.to, volumes: cartPayload.volumes, options: { insurance_value: Number(insurance_value), non_commercial: true } };
      const quoteRes = await axios.post(`${baseUrl}/me/shipment/calculate`, quotePayload, { headers: { ...meHeaders, 'User-Agent': 'Rosia Backend (contato@rosia.com.br)' } });
      const services = Array.isArray(quoteRes?.data) ? quoteRes.data : (quoteRes?.data?.services || []);
      if (!Array.isArray(services) || services.length === 0) {
        return res.status(422).json({ error: 'Transportadora não atende este trecho', details: quoteRes?.data || null });
      }
      const providedServiceId = Number(service_id ?? service) || 0;
      const exists = providedServiceId > 0 && services.some(s => Number(s.id || s.service) === providedServiceId);
      if (exists) {
        cartPayload.service = providedServiceId;
      } else {
        const preferred = services.find(s => /Jadlog|Correios/i.test((s.company?.name || s.name || ''))) || services[0];
        const svcId = Number(preferred?.id || preferred?.service || 0);
        if (svcId > 0) {
          cartPayload.service = svcId;
        } else {
          cartPayload.service = Number(process.env.SANDBOX_DEFAULT_SERVICE || 3);
        }
      }
    } catch (e) {
      console.error('COTACAO_ERROR', e?.response?.data || e.message);
      cartPayload.service = Number(process.env.SANDBOX_DEFAULT_SERVICE || 3);
    }
    console.log('ENVIANDO PAYLOAD CORRIGIDO:', JSON.stringify(cartPayload));
    const cartRes = await axios.post(`${baseUrl}/me/cart`, cartPayload, { headers: { ...meHeaders, 'User-Agent': 'Rosia Backend (contato@rosia.com.br)' } });
    const itemId = cartRes?.data?.id || (Array.isArray(cartRes?.data) ? cartRes.data[0]?.id : null) || null;

    await supabaseAdmin
      .from('melhor_envio_shipments')
      .update({ cart_item_id: itemId, status: 'cart' })
      .eq('id', newShipment.id);

    const checkoutRes = await axios.post(`${baseUrl}/me/shipment/checkout`, { orders: [itemId] }, { headers: meHeaders });
    console.log('DEBUG CHECKOUT ME:', JSON.stringify(checkoutRes.data, null, 2));
    const realId = checkoutRes?.data?.purchase?.orders?.[0]?.id || checkoutRes?.data?.orders?.[0]?.id || null;
    await supabaseAdmin
      .from('melhor_envio_shipments')
      .update({ status: 'released', payment_status: 'paid', me_shipment_id: realId })
      .eq('id', newShipment.id);

    const genRes = await axios.post(`${baseUrl}/me/shipment/generate`, { orders: [realId || itemId] }, { headers: meHeaders });
    let trackingCode = null;
    let labelUrl = null;
    const dynamicId = (realId || itemId) || null;
    const responseData = dynamicId && genRes?.data && typeof genRes.data === 'object' ? genRes.data[dynamicId] : null;
    if (responseData && typeof responseData === 'object') {
      trackingCode = responseData?.tracking || null;
      labelUrl = responseData?.label_url || (responseData?.label?.url || null);
    } else {
      const ordersResp = genRes?.data?.orders || (Array.isArray(genRes?.data) ? genRes.data : []);
      if (Array.isArray(ordersResp) && ordersResp.length > 0) {
        trackingCode = ordersResp[0]?.tracking || null;
        labelUrl = ordersResp[0]?.label?.url || null;
      } else {
        trackingCode = genRes?.data?.tracking || genRes?.data?.protocol || null;
        labelUrl = genRes?.data?.label_url || genRes?.data?.label?.url || null;
      }
    }

    await supabaseAdmin
      .from('melhor_envio_shipments')
      .update({ status: 'pronto_para_envio', tracking_code: trackingCode, label_url: labelUrl })
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

    return res.json({ success: true, shipment_id: newShipment.id, cart_item_id: itemId, tracking_code: trackingCode, label_url: labelUrl, me_id: realId || null, status: 'pronto_para_envio', payment_status: 'paid' });
  } catch (err) {
    console.error('ERRO DETALHADO DA API:', err?.response?.data || err.message);
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
    const statusCode = err?.response?.status || 500;
    if (statusCode === 422) {
      const hasProductsError = !!err?.response?.data?.errors?.products;
      const message = hasProductsError ? 'Erro: Verifique se os produtos do pedido estão cadastrados corretamente' : (err?.response?.data?.message || 'Erro de validação');
      return res.status(422).json({ error: message, details: err?.response?.data });
    }
    if (err?.response?.data) {
      return res.status(statusCode).json({ error: err.response.data });
    }
    return res.status(statusCode).json({ error: err.message });
  }
});

router.get('/pedido/:orderId/status-frete', async (req, res) => {
  try {
    const rawToken = process.env.MELHOR_ENVIO_TOKEN || process.env.MELHOR_ENVIO_SECRET || '';
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!token) {
      return res.status(500).json({ error: 'Token do Melhor Envio não configurado' });
    }

    const { orderId } = req.params;
    const { data: shipments, error: shipErr } = await supabaseAdmin
      .from('melhor_envio_shipments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (shipErr || !shipments || shipments.length === 0) {
      return res.status(404).json({ error: 'Envio não encontrado para este pedido' });
    }
    const shipment = shipments.find(s => !!s.tracking_code) || shipments[0];

    if (shipment.tracking_code) {
      const mappedStatus = shipment.status === 'paid' ? 'aguardando' : (shipment.status === 'generated' ? 'pronto_para_envio' : shipment.status);
      return res.json({
        success: true,
        status: mappedStatus,
        tracking_code: shipment.tracking_code,
        tracking: shipment.tracking_code,
        label_url: shipment.label_url,
        shipment_id: shipment.id
      });
    }

    const meHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Rosia Backend (contato@rosia.com.br)'
    };
    const rawBaseUrlPedido = (process.env.MELHOR_ENVIO_API_URL || 'https://sandbox.melhorenvio.com.br/api/v2').trim().replace(/\/$/, '');
    const baseUrl = rawBaseUrlPedido.includes('/api/v2') ? rawBaseUrlPedido.replace(/\/api\/v2.*$/, '/api/v2') : `${rawBaseUrlPedido}/api/v2`;

    const searchParams = {};
    if (shipment.cart_item_id) {
      searchParams.orders = [shipment.cart_item_id];
    }

    let ordersResp = [];
    try {
      const resp = await axios.get(`${baseUrl}/me/orders/search`, { headers: meHeaders, params: searchParams });
      ordersResp = resp?.data?.orders || (Array.isArray(resp?.data) ? resp.data : []);
    } catch (err) {
      return res.status(202).json({ success: false, status: 'processing', message: 'Etiqueta em processamento no Melhor Envio. Tente novamente em 1 minuto.' });
    }
    let trackingCode = null;
    let labelUrl = null;
    let newStatus = shipment.status;
    if (Array.isArray(ordersResp)) {
      const found = ordersResp.find(o => (o?.id && shipment.cart_item_id && String(o.id) === String(shipment.cart_item_id)) || (o?.tracking && o.tracking));
      if (found) {
        trackingCode = found.tracking || null;
        labelUrl = found.label?.url || found.label_url || null;
        const externalStatus = found?.status || null;
        if (externalStatus) {
          const statusMap = { pending: 'aguardando', released: 'pronto_para_envio', posted: 'enviado', delivered: 'entregue', undelivered: 'devolvido', suspended: 'cancelado' };
          newStatus = statusMap[String(externalStatus).toLowerCase()] || newStatus;
        }
        if (!labelUrl && (found?.id || shipment?.me_shipment_id || shipment?.cart_item_id)) {
          try {
            const idToPrint = found?.id || shipment?.me_shipment_id;
            const printRes = await axios.post(`${baseUrl}/me/shipment/print`, { orders: [idToPrint] }, { headers: meHeaders });
            const printData = idToPrint && printRes?.data && typeof printRes.data === 'object' ? (printRes.data[idToPrint] || null) : null;
            if (printData && typeof printData === 'object') {
              labelUrl = printData?.label_url || printData?.label?.url || labelUrl;
            } else {
              const printOrders = printRes?.data?.orders || (Array.isArray(printRes?.data) ? printRes.data : []);
              if (Array.isArray(printOrders) && printOrders.length > 0) {
                labelUrl = printOrders[0]?.label?.url || printOrders[0]?.label_url || labelUrl;
              }
            }
          } catch (e) {
            console.error('Erro ao obter label via print:', e?.response?.data || e?.message);
          }
        }
      }
    }

    if (trackingCode) {
      await supabaseAdmin
        .from('melhor_envio_shipments')
        .update({ tracking_code: trackingCode, label_url: labelUrl, status: newStatus })
        .eq('id', shipment.id);

      await supabaseAdmin
        .from('orders')
        .update({ tracking_code: trackingCode })
        .eq('id', orderId);

      return res.json({
        status: newStatus,
        tracking_code: trackingCode,
        label_url: labelUrl,
        shipment_id: shipment.id
      });
    }

    const mappedStatus = shipment.status === 'paid' ? 'aguardando' : (shipment.status === 'generated' ? 'pronto_para_envio' : shipment.status);
    return res.json({
      status: mappedStatus,
      tracking_code: null,
      label_url: null,
      shipment_id: shipment.id,
      message: 'Rastreio ainda não disponível'
    });
  } catch (error) {
    return res.status(500).json({ error: error?.response?.data || error.message });
  }
});

router.get('/status-frete/:id', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const rawToken = process.env.MELHOR_ENVIO_TOKEN || process.env.MELHOR_ENVIO_SECRET || '';
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!token) {
      return res.status(500).json({ error: 'Token do Melhor Envio não configurado' });
    }

    const orderId = req.params.id;
    const { data: shipments, error: shipErr } = await supabaseAdmin
      .from('melhor_envio_shipments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (shipErr || !shipments || shipments.length === 0) {
      return res.status(200).json({
        status: 'aguardando',
        tracking_code: null,
        label_url: null,
        shipment_id: null,
        me_id: null,
        payment_status: null,
        message: 'Aguardando geração de frete'
      });
    }
    const shipment = shipments[0];

    if (shipment.tracking_code) {
      const mappedStatus2 = shipment.status === 'paid' ? 'aguardando' : (shipment.status === 'generated' ? 'pronto_para_envio' : shipment.status);
      return res.json({
        status: mappedStatus2,
        tracking_code: shipment.tracking_code,
        label_url: shipment.label_url,
        shipment_id: shipment.id,
        me_id: shipment.me_shipment_id || null,
        payment_status: shipment.payment_status || null
      });
    }

    const meHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Rosia Backend (contato@rosia.com.br)'
    };
    const rawBaseUrlStatus = (process.env.MELHOR_ENVIO_API_URL || 'https://sandbox.melhorenvio.com.br/api/v2').trim().replace(/\/$/, '');
    const baseUrl = rawBaseUrlStatus.includes('/api/v2') ? rawBaseUrlStatus.replace(/\/api\/v2.*$/, '/api/v2') : `${rawBaseUrlStatus}/api/v2`;

    const searchParams = {};
    if (shipment.cart_item_id) {
      searchParams.orders = [shipment.cart_item_id];
    }

    let ordersResp = [];
    try {
      const resp = await axios.get(`${baseUrl}/me/orders/search`, { headers: meHeaders, params: searchParams });
      ordersResp = resp?.data?.orders || (Array.isArray(resp?.data) ? resp.data : []);
    } catch (err) {
      const code = err?.response?.status || 500;
      if (code === 429) {
        return res.status(429).json({ status: 'processando_me', tracking_code: null, label_url: null, shipment_id: shipment.id, me_id: shipment.me_shipment_id || null, payment_status: shipment.payment_status || null, message: 'Limite de taxa atingido. Tente novamente.' });
      }
      if (code === 404 || code === 422) {
        return res.status(202).json({ status: 'processando_me', tracking_code: null, label_url: null, shipment_id: shipment.id, me_id: shipment.me_shipment_id || null, payment_status: shipment.payment_status || null, message: 'Etiqueta em processamento no Melhor Envio' });
      }
      return res.status(500).json({ error: err?.response?.data || err.message });
    }
    let trackingCode = null;
    let labelUrl = null;
    let newStatus = shipment.status;
    if (Array.isArray(ordersResp)) {
      const found = ordersResp.find(o => (o?.id && shipment.cart_item_id && String(o.id) === String(shipment.cart_item_id)) || (o?.tracking && o.tracking));
      if (found) {
        trackingCode = found.tracking || null;
        labelUrl = found.label?.url || found.label_url || null;
        const externalStatus = found?.status || null;
        if (externalStatus) {
          const statusMap = { pending: 'aguardando', released: 'pronto_para_envio', posted: 'enviado', delivered: 'entregue', undelivered: 'devolvido', suspended: 'cancelado' };
          newStatus = statusMap[String(externalStatus).toLowerCase()] || newStatus;
        }
        if (!labelUrl && (found?.id || shipment?.me_shipment_id || shipment?.cart_item_id)) {
          try {
            const idToPrint = found?.id || shipment?.me_shipment_id;
            const printRes = await axios.post(`${baseUrl}/me/shipment/print`, { orders: [idToPrint] }, { headers: meHeaders });
            const printData = idToPrint && printRes?.data && typeof printRes.data === 'object' ? (printRes.data[idToPrint] || null) : null;
            if (printData && typeof printData === 'object') {
              labelUrl = printData?.label_url || printData?.label?.url || labelUrl;
            } else {
              const printOrders = printRes?.data?.orders || (Array.isArray(printRes?.data) ? printRes.data : []);
              if (Array.isArray(printOrders) && printOrders.length > 0) {
                labelUrl = printOrders[0]?.label?.url || printOrders[0]?.label_url || labelUrl;
              }
            }
          } catch (e) {
            console.error('Erro ao obter label via print:', e?.response?.data || e?.message);
          }
        }
      }
    }

    if (trackingCode) {
      await supabaseAdmin
        .from('melhor_envio_shipments')
        .update({ tracking_code: trackingCode, label_url: labelUrl, status: newStatus })
        .eq('id', shipment.id);

      await supabaseAdmin
        .from('orders')
        .update({ tracking_code: trackingCode })
        .eq('id', orderId);

      return res.json({
        status: newStatus,
        tracking_code: trackingCode,
        label_url: labelUrl,
        shipment_id: shipment.id
      });
    }

    const mappedStatus3 = shipment.status === 'paid' ? 'aguardando' : (shipment.status === 'generated' ? 'pronto_para_envio' : shipment.status);
    return res.json({
      status: mappedStatus3,
      tracking_code: null,
      label_url: null,
      shipment_id: shipment.id,
      me_id: shipment.me_shipment_id || null,
      payment_status: shipment.payment_status || null,
      message: 'Rastreio ainda não disponível'
    });
  } catch (error) {
    const code = error?.response?.status || 500;
    if (code === 404 || code === 422) {
      return res.status(202).json({ status: 'processando_me', tracking_code: null, label_url: null, shipment_id: null, me_id: null, payment_status: null, message: 'Etiqueta em processamento no Melhor Envio' });
    }
    return res.status(500).json({ error: error?.response?.data || error.message });
  }
});

router.get('/status-frete/:id/sync', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const rawToken = process.env.MELHOR_ENVIO_TOKEN || process.env.MELHOR_ENVIO_SECRET || '';
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!token) {
      return res.status(500).json({ error: 'Token do Melhor Envio não configurado' });
    }

    const orderId = req.params.id;
    const { data: shipments, error: shipErr } = await supabaseAdmin
      .from('melhor_envio_shipments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (shipErr || !shipments || shipments.length === 0) {
      return res.status(404).json({ error: 'Envio não encontrado para este pedido' });
    }
    const shipment = shipments.find(s => !!s.tracking_code) || shipments[0];

    if (shipment.tracking_code) {
      const mappedStatus4 = shipment.status === 'paid' ? 'aguardando' : (shipment.status === 'generated' ? 'pronto_para_envio' : shipment.status);
      return res.json({
        status: mappedStatus4,
        tracking_code: shipment.tracking_code,
        label_url: shipment.label_url,
        shipment_id: shipment.id
      });
    }
    const meHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Rosia Backend (contato@rosia.com.br)'
    };
    const rawBaseUrlSync = (process.env.MELHOR_ENVIO_API_URL || 'https://sandbox.melhorenvio.com.br/api/v2').trim().replace(/\/$/, '');
    const baseUrl = rawBaseUrlSync.includes('/api/v2') ? rawBaseUrlSync.replace(/\/api\/v2.*$/, '/api/v2') : `${rawBaseUrlSync}/api/v2`;

    let targetMeId = shipment.me_shipment_id || null;
    const key = (targetMeId ? `me:${targetMeId}` : `order:${orderId}`);
    global.__meSyncLocks = global.__meSyncLocks || new Map();
    const last = global.__meSyncLocks.get(key) || 0;
    if (Date.now() - last < 4000) {
      return res.status(202).json({ success: false, status: 'processando_me', me_id: targetMeId || null });
    }
    global.__meSyncLocks.set(key, Date.now());
    if (!targetMeId) {
      try {
        const qParam = shipment.recipient_document || shipment.recipient_email || null;
        if (qParam) {
          const searchResp = await axios.get(`${baseUrl}/me/orders/search`, { headers: meHeaders, params: { q: qParam } });
          const foundOrder = searchResp?.data?.orders?.[0] || (Array.isArray(searchResp?.data) ? searchResp.data[0] : null) || null;
          if (foundOrder?.id) {
            targetMeId = foundOrder.id;
            await supabaseAdmin
              .from('melhor_envio_shipments')
              .update({ me_shipment_id: foundOrder.id })
              .eq('order_id', orderId);
          }
        }
      } catch (_) {}
    }

    let trackingCode = null;
    let labelUrl = null;
    try {
      if (targetMeId) {
        const checkRes = await axios.get(`${baseUrl}/me/orders/${targetMeId}`, { headers: meHeaders });
        const meData = checkRes?.data;
        trackingCode = meData?.tracking || null;
        labelUrl = meData?.label?.url || meData?.label_url || null;
      }
    } catch (_) {}

    if (!trackingCode && targetMeId) {
      try {
        await axios.post(`${baseUrl}/me/shipment/generate`, { orders: [targetMeId] }, { headers: meHeaders });
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryRes = await axios.get(`${baseUrl}/me/orders/${targetMeId}`, { headers: meHeaders });
        trackingCode = retryRes?.data?.tracking || null;
        labelUrl = retryRes?.data?.label?.url || retryRes?.data?.label_url || null;
      } catch (_) {}
    }

    const newStatus = trackingCode ? 'pronto_para_envio' : 'processando_me';
    await supabaseAdmin
      .from('melhor_envio_shipments')
      .update({
        tracking_code: trackingCode,
        label_url: labelUrl,
        status: newStatus,
        updated_at: new Date()
      })
      .eq('order_id', orderId);

    if (trackingCode) {
      await supabaseAdmin
        .from('orders')
        .update({ tracking_code: trackingCode, status: 'processando' })
        .eq('id', orderId);
    }

    return res.json({
      success: true,
      tracking: trackingCode,
      status: newStatus,
      me_id: targetMeId || null,
      message: trackingCode ? 'Sincronizado!' : 'Em processamento no Melhor Envio.'
    });
  } catch (error) {
    return res.status(500).json({ error: error?.response?.data || error.message });
  }
});

router.post('/imprimir-etiqueta/:orderId', async (req, res) => {
  try {
    const rawToken = process.env.MELHOR_ENVIO_TOKEN || process.env.MELHOR_ENVIO_SECRET || '';
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!token) {
      return res.status(500).json({ success: false, message: 'Token do Melhor Envio não configurado' });
    }

    const { orderId } = req.params;
    const meHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Rosia Backend (contato@rosia.com.br)'
    };
    const rawBaseUrl = (process.env.MELHOR_ENVIO_API_URL || 'https://sandbox.melhorenvio.com.br/api/v2').trim().replace(/\/$/, '');
    const baseUrl = rawBaseUrl.includes('/api/v2') ? rawBaseUrl.replace(/\/api\/v2.*$/, '/api/v2') : `${rawBaseUrl}/api/v2`;

    let idToPrint = null;
    const { data: shipments } = await supabaseAdmin
      .from('melhor_envio_shipments')
      .select('id, order_id, me_shipment_id, cart_item_id, label_url, status')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (Array.isArray(shipments) && shipments.length > 0) {
      idToPrint = shipments[0]?.me_shipment_id || shipments[0]?.cart_item_id || null;
    }
    if (!idToPrint) {
      idToPrint = orderId;
    }
    console.log('PRINT ID RESOLVIDO:', idToPrint);
    if (!idToPrint) {
      return res.status(404).json({ success: false, message: 'ID do envio não encontrado para impressão' });
    }

    const response = await axios.post(`${baseUrl}/me/shipment/print`, { orders: [idToPrint] }, { headers: meHeaders });

    let labelUrl = null;
    const keyed = idToPrint && response?.data && typeof response.data === 'object' ? (response.data[idToPrint] || null) : null;
    if (keyed && typeof keyed === 'object') {
      labelUrl = keyed?.label_url || keyed?.label?.url || keyed?.url || null;
    } else {
      labelUrl = response?.data?.url || response?.data?.label?.url || null;
      const ordersArr = response?.data?.orders || (Array.isArray(response?.data) ? response.data : []);
      if (!labelUrl && Array.isArray(ordersArr) && ordersArr.length > 0) {
        const first = ordersArr[0];
        labelUrl = first?.label_url || first?.label?.url || null;
      }
    }

    if (!labelUrl) {
      return res.status(202).json({ success: false, message: 'Etiqueta em processamento. Tente novamente.' });
    }

    if (Array.isArray(shipments) && shipments.length > 0) {
      await supabaseAdmin
        .from('melhor_envio_shipments')
        .update({ label_url: labelUrl, status: 'pronto_para_envio' })
        .eq('id', shipments[0].id);
    }

    return res.json({ success: true, url: labelUrl });
  } catch (error) {
    console.error('ERRO AO GERAR ETIQUETA:', error?.response?.data || error.message);
    const code = error?.response?.status || 500;
    if (code === 404 || code === 422) {
      return res.status(202).json({ success: false, message: 'Etiqueta em processamento no Melhor Envio' });
    }
    return res.status(500).json({ success: false, message: 'Falha ao gerar link da etiqueta' });
  }
});

router.get('/status-frete/sync', shippingController.apenasSincronizar);
router.get('/sync', shippingController.apenasSincronizar);

router.post('/pagar-envio/:id', shippingController.pagarESincronizar);

router.post('/pagar-envio', shippingController.pagarESincronizar);

// Debug: visualizar payload enviado ao /me/cart antes de chamar a API
router.get('/debug/me-cart-payload/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, items, shipping_address, total, user_id, google_user_profile_id, user_info')
      .eq('id', orderId)
      .single();
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    let profile = null;
    if (order.google_user_profile_id) {
      const { data: gp } = await supabaseAdmin
        .from('google_user_profiles')
        .select('nome, cpf, email, telefone, data_nascimento')
        .eq('id', order.google_user_profile_id)
        .maybeSingle();
      profile = gp || null;
    }

    const addr = order.shipping_address || {};
    const sender = buildSender();
    const recipient = {
      name: profile?.nome || order.user_info?.name || 'Cliente',
      document: profile?.cpf || order.user_info?.cpf || null,
      email: profile?.email || order.user_info?.email || null,
      phone: profile?.telefone || order.user_info?.phone || process.env.DEFAULT_RECIPIENT_PHONE || '11999999999',
      company: null,
      birth_date: profile?.data_nascimento || null,
      street: addr.logradouro || null,
      number: String(addr.numero || ''),
      complement: addr.complemento || null,
      neighborhood: addr.bairro || null,
      city: addr.cidade || null,
      state: addr.estado || null,
      postal_code: addr.cep || null,
      country: 'BR'
    };

    const vols = buildVolumes(order.items || [], null);
    function normalizeMoney(v) { const n = Number(v); return Number.isFinite(n) ? Number(n.toFixed(2)) : 0; }
    let productsPayload = [];
    const { data: orderItemsData } = await supabaseAdmin
      .from('order_items')
      .select('product_name, unit_price, quantity')
      .eq('order_id', order.id);
    if (Array.isArray(orderItemsData) && orderItemsData.length > 0) {
      productsPayload = orderItemsData.map(oi => ({ name: oi.product_name || 'Produto Comercial', quantity: Number(oi.quantity) || 1, unitary_value: normalizeMoney(oi.unit_price) }));
    } else if (Array.isArray(order.items)) {
      productsPayload = order.items.map(it => ({ name: it.product_name || 'Produto Comercial', quantity: Number(it.quantity) || 1, unitary_value: normalizeMoney(it.product_price || it.total || 0) }));
    }
    const cleanProducts = productsPayload.map(p => ({ name: String(p.name || '').substring(0, 50), quantity: Number(p.quantity), unitary_value: Number(p.unitary_value) }));
    const declaredTotal = cleanProducts.reduce((sum, p) => sum + (Number(p.unitary_value) * Number(p.quantity)), 0);
    function onlyDigits(v) { return (v == null ? '' : String(v)).replace(/\D/g, ''); }
    const finalVolumes = (Array.isArray(vols) ? vols : []).map((v, idx) => ({ height: Number(v.height), width: Number(v.width), length: Number(v.length), weight: Number(v.weight), products: idx === 0 ? cleanProducts : [] }));
    const forcedFromPostal = onlyDigits(process.env.SANDBOX_FORCE_FROM_CEP || '');
    const forcedToPostal = onlyDigits(process.env.SANDBOX_FORCE_TO_CEP || '');
    const payload = {
      service: Number(process.env.SANDBOX_DEFAULT_SERVICE || 3),
      from: { name: sender.name, postal_code: forcedFromPostal || onlyDigits(sender.postal_code), address: sender.street, number: sender.number, complement: sender.complement, district: sender.neighborhood, city: sender.city, state_abbr: sender.state, country: sender.country, country_id: 'BR', email: sender.email, document: onlyDigits(sender.document), phone: onlyDigits(sender.phone) },
      to: { name: recipient.name, postal_code: forcedToPostal || onlyDigits(recipient.postal_code), address: recipient.street, number: recipient.number, complement: recipient.complement, district: recipient.neighborhood, city: recipient.city, state_abbr: recipient.state, country: recipient.country, country_id: 'BR', email: recipient.email, document: onlyDigits(recipient.document || ''), phone: onlyDigits(recipient.phone) },
      volumes: finalVolumes,
      options: { insurance_value: normalizeMoney(declaredTotal || (order.total || 0)), non_commercial: true }
    };
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/pedido/:orderId/validar-envio', async (req, res) => {
  try {
    const rawToken = process.env.MELHOR_ENVIO_TOKEN || process.env.MELHOR_ENVIO_SECRET || '';
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!token) {
      return res.status(500).json({ error: 'Token do Melhor Envio não configurado' });
    }

    const { orderId } = req.params;
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, items, shipping_address, total, user_id, google_user_profile_id, user_info')
      .eq('id', orderId)
      .single();
    if (orderErr || !order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    let profile = null;
    if (order.google_user_profile_id) {
      const { data: gp } = await supabaseAdmin
        .from('google_user_profiles')
        .select('nome, cpf, email, telefone, data_nascimento')
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
      phone: profile?.phone || order.user_info?.phone || process.env.DEFAULT_RECIPIENT_PHONE || '11999999999',
      street: addr.logradouro || null,
      number: String(addr.numero || ''),
      complement: addr.complemento || null,
      neighborhood: addr.bairro || null,
      city: addr.cidade || null,
      state: addr.estado || null,
      postal_code: addr.cep || null,
      country: 'BR'
    };

    const vols = buildVolumes(order.items || [], null);
    function normalizeMoney(v) { const n = Number(v); return Number.isFinite(n) ? Number(n.toFixed(2)) : 0; }
    let productsPayload = [];
    const { data: orderItemsData } = await supabaseAdmin
      .from('order_items')
      .select('product_name, unit_price, quantity')
      .eq('order_id', order.id);
    if (Array.isArray(orderItemsData) && orderItemsData.length > 0) {
      productsPayload = orderItemsData.map(oi => ({ name: oi.product_name || 'Produto Comercial', quantity: Number(oi.quantity) || 1, unitary_value: normalizeMoney(oi.unit_price) }));
    } else if (Array.isArray(order.items)) {
      productsPayload = order.items.map(it => ({ name: it.product_name || 'Produto Comercial', quantity: Number(it.quantity) || 1, unitary_value: normalizeMoney(it.product_price || it.total || 0) }));
    }
    const declaredTotal = productsPayload.reduce((sum, p) => sum + (Number(p.unitary_value) * Number(p.quantity)), 0);
    const issues = [];
    if (!recipient.phone) issues.push('Falta telefone do destinatário');
    if (!Array.isArray(productsPayload) || productsPayload.length === 0) issues.push('Nenhum produto encontrado');
    if (productsPayload.some(p => !(Number(p.quantity) > 0))) issues.push('Produto com quantidade inválida');
    if (productsPayload.some(p => !(Number(p.unitary_value) > 0))) issues.push('Produto com valor inválido');

    return res.json({
      valid: issues.length === 0,
      issues,
      products: productsPayload,
      volumes: vols,
      insurance_value: normalizeMoney(declaredTotal || (order.total || 0)),
      recipient_phone: recipient.phone || null
    });
  } catch (error) {
    return res.status(500).json({ error: error?.response?.data || error.message });
  }
});

router.post('/pedido/:orderId/cotacao-me', async (req, res) => {
  try {
    const rawToken = process.env.MELHOR_ENVIO_TOKEN || process.env.MELHOR_ENVIO_SECRET || '';
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!token) {
      return res.status(500).json({ error: 'Token do Melhor Envio não configurado' });
    }
    const { orderId } = req.params;
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, items, shipping_address, total, user_id, google_user_profile_id, user_info')
      .eq('id', orderId)
      .single();
    if (orderErr || !order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    let profile = null;
    if (order.google_user_profile_id) {
      const { data: gp } = await supabaseAdmin
        .from('google_user_profiles')
        .select('nome, cpf, email, telefone, data_nascimento')
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
      phone: profile?.phone || order.user_info?.phone || process.env.DEFAULT_RECIPIENT_PHONE || '11999999999',
      street: addr.logradouro || null,
      number: String(addr.numero || ''),
      complement: addr.complemento || null,
      neighborhood: addr.bairro || null,
      city: addr.cidade || null,
      state: addr.estado || null,
      postal_code: addr.cep || null,
      country: 'BR'
    };
    const vols = buildVolumes(order.items || [], req.body?.volumes);
    function normalizeMoney(v) { const n = Number(v); return Number.isFinite(n) ? Number(n.toFixed(2)) : 0; }
    const { data: orderItemsData } = await supabaseAdmin
      .from('order_items')
      .select('product_name, unit_price, quantity')
      .eq('order_id', order.id);
    let productsPayload = [];
    if (Array.isArray(orderItemsData) && orderItemsData.length > 0) {
      productsPayload = orderItemsData.map(oi => ({ name: oi.product_name || 'Produto Comercial', quantity: Number(oi.quantity) || 1, unitary_value: normalizeMoney(oi.unit_price) }));
    } else if (Array.isArray(order.items)) {
      productsPayload = order.items.map(it => ({ name: it.product_name || 'Produto Comercial', quantity: Number(it.quantity) || 1, unitary_value: normalizeMoney(it.product_price || it.total || 0) }));
    }
    const cleanProducts = productsPayload.map(p => ({ name: String(p.name || '').substring(0, 50), quantity: Number(p.quantity), unitary_value: Number(p.unitary_value) }));
    const declaredTotal = cleanProducts.reduce((sum, p) => sum + (Number(p.unitary_value) * Number(p.quantity)), 0);
    function onlyDigits(v) { return (v == null ? '' : String(v)).replace(/\D/g, ''); }
    const volumesWithProducts = (Array.isArray(vols) ? vols : []).map((v, idx) => ({ height: Number(v.height), width: Number(v.width), length: Number(v.length), weight: Number(v.weight), products: idx === 0 ? cleanProducts : [] }));
    const forcedFromPostal = onlyDigits(process.env.SANDBOX_FORCE_FROM_CEP || '');
    const forcedToPostal = onlyDigits(process.env.SANDBOX_FORCE_TO_CEP || '');

    const meHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'Rosia Backend (contato@rosia.com.br)' };
    const rawBaseUrlCalcPublic = (process.env.MELHOR_ENVIO_API_URL || 'https://sandbox.melhorenvio.com.br/api/v2').trim().replace(/\/$/, '');
    const baseUrl = rawBaseUrlCalcPublic.includes('/api/v2') ? rawBaseUrlCalcPublic.replace(/\/api\/v2.*$/, '/api/v2') : `${rawBaseUrlCalcPublic}/api/v2`;
    const payload = { from: { name: sender.name, postal_code: forcedFromPostal || onlyDigits(sender.postal_code), address: sender.street, number: sender.number, complement: sender.complement, district: sender.neighborhood, city: sender.city, state_abbr: sender.state, country: sender.country, country_id: 'BR', email: sender.email, document: onlyDigits(sender.document), phone: onlyDigits(sender.phone) }, to: { name: recipient.name, postal_code: forcedToPostal || onlyDigits(recipient.postal_code), address: recipient.street, number: recipient.number, complement: recipient.complement, district: recipient.neighborhood, city: recipient.city, state_abbr: recipient.state, country: recipient.country, country_id: 'BR', email: recipient.email, document: onlyDigits(recipient.document || ''), phone: onlyDigits(recipient.phone) }, volumes: volumesWithProducts, options: { insurance_value: normalizeMoney(declaredTotal || (order.total || 0)), non_commercial: true } };
    const resp = await axios.post(`${baseUrl}/me/shipment/calculate`, payload, { headers: meHeaders });
    return res.json(resp.data);
  } catch (error) {
    const statusCode = error?.response?.status || 500;
    if (statusCode === 422) {
      return res.status(422).json({ error: 'Erro de validação na cotação', details: error?.response?.data });
    }
    if (error?.response?.data) {
      return res.status(statusCode).json({ error: error.response.data });
    }
    return res.status(statusCode).json({ error: error.message });
  }
});

 
router.patch('/cep', async (req, res) => {
  try {
    const { region, time, price } = req.body || {};
    if (!region || !time || price === undefined || price === null) {
      return res.status(400).json({ success: false, error: 'Parâmetros obrigatórios ausentes' });
    }

    const regionUpper = String(region).toUpperCase();
    const { data, error } = await supabaseAdmin
      .from('cep')
      .update({ region: regionUpper, time: String(time), price: Number(price) })
      .eq('region', regionUpper)
      .select();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Nenhuma linha atualizada' });
    }
    return res.json({ success: true, data: data[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || 'Erro ao atualizar frete' });
  }
});

 
router.post('/cep', async (req, res) => {
  try {
    const { region, time, price } = req.body || {};
    if (!region || !time || price === undefined || price === null) {
      return res.status(400).json({ success: false, error: 'Parâmetros obrigatórios ausentes' });
    }

    const regionUpper = String(region).toUpperCase();
    const { data, error } = await supabaseAdmin
      .from('cep')
      .insert({ region: regionUpper, time: String(time), price: Number(price) })
      .select();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, error: 'Falha ao inserir frete' });
    }
    return res.status(201).json({ success: true, data: data[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || 'Erro ao adicionar frete' });
  }
});

 
router.delete('/cep', async (req, res) => {
  try {
    const region = req.query?.region || req.body?.region;
    if (!region) {
      return res.status(400).json({ success: false, error: 'region é obrigatório' });
    }

    const regionUpper = String(region).toUpperCase();
    const { error } = await supabaseAdmin
      .from('cep')
      .delete()
      .eq('region', regionUpper);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || 'Erro ao remover frete' });
  }
});

router.patch('/shipping-company/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description, active, cep_region, cep_time, cep_price } = req.body || {};
    if (!id) {
      return res.status(400).json({ success: false, error: 'id é obrigatório' });
    }

    const payload = {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(description !== undefined ? { description: description ? String(description) : null } : {}),
      ...(active !== undefined ? { active: Boolean(active) } : {}),
      ...(cep_region !== undefined ? { cep_region: String(cep_region) } : {}),
      ...(cep_time !== undefined ? { cep_time: String(cep_time) } : {}),
      ...(cep_price !== undefined ? { cep_price: Number(cep_price) } : {})
    };

    const { data, error } = await supabaseAdmin
      .from('shipping_company')
      .update(payload)
      .eq('id', id)
      .select('*');

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Transportadora não encontrada' });
    }
    return res.json({ success: true, data: data[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || 'Erro ao atualizar transportadora' });
  }
});

router.post('/shipping-company', async (req, res) => {
  try {
    const { name, description, active, cep_region, cep_time, cep_price } = req.body || {};
    if (!name) {
      return res.status(400).json({ success: false, error: 'name é obrigatório' });
    }

    const payload = {
      name: String(name).trim(),
      description: description ? String(description) : null,
      active: Boolean(active),
      cep_region: cep_region ? String(cep_region) : null,
      cep_time: cep_time ? String(cep_time) : null,
      cep_price: cep_price !== undefined && cep_price !== null ? Number(cep_price) : null
    };

    const { data, error } = await supabaseAdmin
      .from('shipping_company')
      .insert(payload)
      .select('*');

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, error: 'Falha ao inserir transportadora' });
    }
    return res.status(201).json({ success: true, data: data[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || 'Erro ao adicionar transportadora' });
  }
});

router.delete('/shipping-company/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id é obrigatório' });
    }

    const { error } = await supabaseAdmin
      .from('shipping_company')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || 'Erro ao remover transportadora' });
  }
});

router.get('/shipping-company', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('shipping_company')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || 'Erro ao listar transportadoras' });
  }
});

module.exports = router;

