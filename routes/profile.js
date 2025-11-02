const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * GET /profile/me
 * Buscar perfil completo do usuário logado
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Buscar dados completos usando a view
    const { data: profile, error } = await supabase
      .from('user_complete_profile')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil:', error);
      return res.status(500).json({
        error: 'Erro ao buscar perfil do usuário'
      });
    }

    res.json({
      success: true,
      profile: profile
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /profile/me
 * Atualizar dados pessoais do usuário
 */
router.put('/me', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      full_name,
      cpf,
      phone,
      birth_date,
      gender,
      newsletter_subscription,
      sms_notifications
    } = req.body;

    // Validar CPF se fornecido
    if (cpf && !/^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$/.test(cpf)) {
      return res.status(400).json({
        error: 'CPF deve estar no formato 000.000.000-00'
      });
    }

    // Verificar se o perfil já existe
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    const profileData = {
      full_name,
      cpf,
      phone,
      birth_date,
      gender,
      newsletter_subscription,
      sms_notifications,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingProfile) {
      // Atualizar perfil existente
      result = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();
    } else {
      // Criar novo perfil
      result = await supabase
        .from('user_profiles')
        .insert({ ...profileData, id: userId })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Erro ao salvar perfil:', result.error);
      return res.status(500).json({
        error: 'Erro ao salvar dados do perfil'
      });
    }

    res.json({
      success: true,
      profile: result.data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /profile/addresses
 * Listar endereços do usuário
 */
router.get('/addresses', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: addresses, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar endereços:', error);
      return res.status(500).json({
        error: 'Erro ao buscar endereços'
      });
    }

    res.json({
      success: true,
      addresses: addresses || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /profile/addresses
 * Adicionar novo endereço
 */
router.post('/addresses', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      label,
      recipient_name,
      street,
      complement,
      neighborhood,
      city,
      state,
      zip_code,
      country = 'Brasil',
      is_default = false
    } = req.body;

    // Validações
    if (!recipient_name || !street || !neighborhood || !city || !state || !zip_code) {
      return res.status(400).json({
        error: 'Campos obrigatórios: recipient_name, street, neighborhood, city, state, zip_code'
      });
    }

    // Validar CEP
    if (!/^[0-9]{5}-[0-9]{3}$/.test(zip_code)) {
      return res.status(400).json({
        error: 'CEP deve estar no formato 00000-000'
      });
    }

    // Validar estado
    if (state.length !== 2) {
      return res.status(400).json({
        error: 'Estado deve ter 2 caracteres (ex: SP)'
      });
    }

    const addressData = {
      user_id: userId,
      label: label || 'Principal',
      recipient_name,
      street,
      complement,
      neighborhood,
      city,
      state: state.toUpperCase(),
      zip_code,
      country,
      is_default
    };

    const { data: address, error } = await supabase
      .from('user_addresses')
      .insert(addressData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar endereço:', error);
      return res.status(500).json({
        error: 'Erro ao criar endereço'
      });
    }

    res.status(201).json({
      success: true,
      address: address
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /profile/addresses/:id
 * Atualizar endereço
 */
router.put('/addresses/:id', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;
    const updateData = req.body;

    // Validar CEP se fornecido
    if (updateData.zip_code && !/^[0-9]{5}-[0-9]{3}$/.test(updateData.zip_code)) {
      return res.status(400).json({
        error: 'CEP deve estar no formato 00000-000'
      });
    }

    // Validar estado se fornecido
    if (updateData.state && updateData.state.length !== 2) {
      return res.status(400).json({
        error: 'Estado deve ter 2 caracteres (ex: SP)'
      });
    }

    if (updateData.state) {
      updateData.state = updateData.state.toUpperCase();
    }

    const { data: address, error } = await supabase
      .from('user_addresses')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', addressId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar endereço:', error);
      return res.status(500).json({
        error: 'Erro ao atualizar endereço'
      });
    }

    if (!address) {
      return res.status(404).json({
        error: 'Endereço não encontrado'
      });
    }

    res.json({
      success: true,
      address: address
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /profile/addresses/:id
 * Remover endereço
 */
router.delete('/addresses/:id', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    const { error } = await supabase
      .from('user_addresses')
      .update({ is_active: false })
      .eq('id', addressId)
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao remover endereço:', error);
      return res.status(500).json({
        error: 'Erro ao remover endereço'
      });
    }

    res.json({
      success: true,
      message: 'Endereço removido com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /profile/cart
 * Buscar itens do carrinho
 */
router.get('/cart', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: cartItems, error } = await supabase
      .from('cart_with_products')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar carrinho:', error);
      return res.status(500).json({
        error: 'Erro ao buscar itens do carrinho'
      });
    }

    // Calcular totais
    const subtotal = cartItems?.reduce((sum, item) => sum + parseFloat(item.total_price), 0) || 0;
    const itemsCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    res.json({
      success: true,
      cart: {
        items: cartItems || [],
        subtotal: subtotal,
        items_count: itemsCount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /profile/cart
 * Adicionar item ao carrinho
 */
router.post('/cart', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { product_id, quantity = 1, size, color } = req.body;

    if (!product_id) {
      return res.status(400).json({
        error: 'product_id é obrigatório'
      });
    }

    // Buscar dados do produto
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, stock, status')
      .eq('id', product_id)
      .eq('status', 'active')
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: 'Produto não encontrado ou inativo'
      });
    }

    // Verificar estoque
    if (product.stock < quantity) {
      return res.status(400).json({
        error: 'Quantidade solicitada maior que o estoque disponível'
      });
    }

    // Verificar se item já existe no carrinho
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', product_id)
      .eq('size', size || '')
      .eq('color', color || '')
      .single();

    let result;
    if (existingItem) {
      // Atualizar quantidade
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        return res.status(400).json({
          error: 'Quantidade total excede o estoque disponível'
        });
      }

      result = await supabase
        .from('cart_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id)
        .select()
        .single();
    } else {
      // Criar novo item
      result = await supabase
        .from('cart_items')
        .insert({
          user_id: userId,
          product_id,
          quantity,
          size,
          color,
          unit_price: product.price
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Erro ao adicionar ao carrinho:', result.error);
      return res.status(500).json({
        error: 'Erro ao adicionar item ao carrinho'
      });
    }

    res.status(201).json({
      success: true,
      cart_item: result.data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /profile/cart/:id
 * Atualizar quantidade do item no carrinho
 */
router.put('/cart/:id', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        error: 'Quantidade deve ser maior que 0'
      });
    }

    // Buscar item do carrinho
    const { data: cartItem, error: cartError } = await supabase
      .from('cart_items')
      .select('*, products(stock)')
      .eq('id', itemId)
      .eq('user_id', userId)
      .single();

    if (cartError || !cartItem) {
      return res.status(404).json({
        error: 'Item não encontrado no carrinho'
      });
    }

    // Verificar estoque
    if (quantity > cartItem.products.stock) {
      return res.status(400).json({
        error: 'Quantidade maior que o estoque disponível'
      });
    }

    const { data: updatedItem, error } = await supabase
      .from('cart_items')
      .update({ 
        quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar carrinho:', error);
      return res.status(500).json({
        error: 'Erro ao atualizar item do carrinho'
      });
    }

    res.json({
      success: true,
      cart_item: updatedItem
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /profile/cart/:id
 * Remover item do carrinho
 */
router.delete('/cart/:id', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao remover do carrinho:', error);
      return res.status(500).json({
        error: 'Erro ao remover item do carrinho'
      });
    }

    res.json({
      success: true,
      message: 'Item removido do carrinho'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /profile/cart
 * Limpar carrinho
 */
router.delete('/cart', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao limpar carrinho:', error);
      return res.status(500).json({
        error: 'Erro ao limpar carrinho'
      });
    }

    res.json({
      success: true,
      message: 'Carrinho limpo com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /profile/favorites
 * Listar produtos favoritos
 */
router.get('/favorites', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        id,
        created_at,
        products (
          id,
          name,
          description,
          price,
          category,
          status,
          product_images (url, is_primary)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar favoritos:', error);
      return res.status(500).json({
        error: 'Erro ao buscar produtos favoritos'
      });
    }

    res.json({
      success: true,
      favorites: favorites || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /profile/favorites
 * Adicionar produto aos favoritos
 */
router.post('/favorites', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({
        error: 'product_id é obrigatório'
      });
    }

    // Verificar se produto existe
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }

    const { data: favorite, error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: userId,
        product_id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          error: 'Produto já está nos favoritos'
        });
      }
      console.error('Erro ao adicionar favorito:', error);
      return res.status(500).json({
        error: 'Erro ao adicionar aos favoritos'
      });
    }

    res.status(201).json({
      success: true,
      favorite: favorite
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /profile/favorites/:product_id
 * Remover produto dos favoritos
 */
router.delete('/favorites/:product_id', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const productId = req.params.product_id;

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      console.error('Erro ao remover favorito:', error);
      return res.status(500).json({
        error: 'Erro ao remover dos favoritos'
      });
    }

    res.json({
      success: true,
      message: 'Produto removido dos favoritos'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

