const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateSupabaseGoogleUser } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/cart/add
 * Adiciona item ao carrinho do usuário Google autenticado (usando product_variants)
 */
router.post('/add', authenticateSupabaseGoogleUser, async (req, res, next) => {
  try {
    // 🔍 Debug estilo google-separated
    console.log('🔍 POST /api/cart/add - Dados recebidos:', req.body);

    const origin = req.headers.origin;
    if (origin) {
      console.log(`CORS Debug - Origin: ${origin}, Method: ${req.method}, Path: ${req.originalUrl}`);
    }

    const userId = req.user?.id;
    const { product_variant_id, quantity = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado', code: 'UNAUTHENTICATED' });
    }

    if (!product_variant_id) {
      return res.status(400).json({ success: false, error: 'product_variant_id é obrigatório', code: 'MISSING_PRODUCT_VARIANT_ID' });
    }

    // Validar formato de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(product_variant_id)) {
      return res.status(400).json({ success: false, error: 'ID da variant inválido', code: 'INVALID_VARIANT_ID' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Quantidade deve ser maior que 0', code: 'INVALID_QUANTITY' });
    }

    // Buscar variant e aplicar regra de atividade com fallback
    const { data: variant, error: variantError } = await supabaseAdmin
      .from('product_variants')
      .select('id, product_id, price, discounted_price, has_discount, stock, size, color')
      .eq('id', product_variant_id)
      .maybeSingle();

    if (variantError || !variant) {
      console.warn('[cart/add] Variant não encontrada', { product_variant_id, variantError });
      return res.status(404).json({ success: false, error: 'Variant não encontrada', code: 'VARIANT_NOT_FOUND' });
    }

    // Validar estoque da variant
    if (variant.stock < quantity) {
      return res.status(400).json({ success: false, error: 'Quantidade maior que o estoque disponível da variant', code: 'QUANTITY_EXCEEDS_STOCK' });
    }

    // Obter ou criar carrinho do usuário
    const { data: existingCart } = await supabaseAdmin
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let cartId = existingCart?.id;
    if (!cartId) {
      const { data: newCart, error: cartCreateError } = await supabaseAdmin
        .from('carts')
        .insert({ user_id: userId })
        .select('id')
        .single();
      if (cartCreateError || !newCart) {
        console.error('[cart/add] Erro ao criar carrinho', cartCreateError);
        return res.status(500).json({ success: false, error: 'Erro ao preparar carrinho do usuário', code: 'CART_CREATE_FAILED' });
      }
      cartId = newCart.id;
    }

    // Preço no momento da compra
    const priceAtPurchase = variant.has_discount ? (variant.discounted_price ?? variant.price) : variant.price;

    // Verificar se item (variant) já existe no carrinho
    const { data: existingItem } = await supabaseAdmin
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('product_variant_id', product_variant_id)
      .maybeSingle();

    let result;
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > variant.stock) {
        return res.status(400).json({ success: false, error: 'Quantidade total excede o estoque disponível da variant', code: 'TOTAL_QUANTITY_EXCEEDS_STOCK' });
      }

      result = await supabaseAdmin
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id)
        .select()
        .single();
    } else {
      result = await supabaseAdmin
        .from('cart_items')
        .insert({
          cart_id: cartId,
          product_variant_id,
          quantity,
          price: priceAtPurchase
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Erro ao adicionar item (variant) ao carrinho:', result.error);
      return res.status(500).json({ success: false, error: 'Erro ao adicionar item ao carrinho', code: 'CART_ITEM_ADD_FAILED' });
    }

    res.status(201).json({ success: true, cart_item: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cart
 * Retorna o carrinho do usuário Google autenticado
 */
router.get('/', authenticateSupabaseGoogleUser, async (req, res, next) => {
  try {
    console.log('🔍 GET /api/cart - Consulta de carrinho');

    const origin = req.headers.origin;
    if (origin) {
      console.log(`CORS Debug - Origin: ${origin}, Method: ${req.method}, Path: ${req.originalUrl}`);
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado', code: 'UNAUTHENTICATED' });
    }

    // Buscar itens do carrinho juntando com carts para filtrar por user_id
    const { data: cartRows, error: cartErr } = await supabaseAdmin
      .from('cart_items')
      .select(`
        id,
        cart_id,
        product_variant_id,
        quantity,
        price,
        carts!inner(id),
        product_variants!inner(
          id,
          product_id,
          color,
          size,
          price,
          discounted_price,
          has_discount,
          stock,
          image_url,
          products(*)
        )
      `)
      .eq('carts.user_id', userId);

    if (cartErr) {
      console.error('Erro ao buscar itens do carrinho:', cartErr);
      return res.status(500).json({ success: false, error: 'Erro ao buscar itens do carrinho', code: 'CART_FETCH_FAILED' });
    }

    // Calcular subtotal e formatar resposta
    const subtotal = (cartRows || []).reduce((sum, item) => {
      const price = Number(item.price) || 0;
      return sum + price * item.quantity;
    }, 0);

    const itemsCount = (cartRows || []).reduce((sum, item) => sum + item.quantity, 0);

    const formatted = (cartRows || []).map(item => {
      const v = item.product_variants || null;
      const p = v?.products || null;
      const imageCandidate = (v?.image_url ?? (Array.isArray(p?.images) ? p.images[0] : null)) ?? null;
      return {
        item_id: item.id,
        quantity: item.quantity,
        price: Number(item.price) || 0,
        color: v?.color || null,
        size: v?.size || null,
        image_url: imageCandidate,
        product_name: p?.name || null,
        product_id: v?.product_id || null,
        product_variant_id: item.product_variant_id
      };
    });

    return res.json({
      success: true,
      cart: {
        items: formatted,
        subtotal,
        items_count: itemsCount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/cart/update
 * Atualiza quantidade de um item do carrinho
 */
router.patch('/update', authenticateSupabaseGoogleUser, async (req, res, next) => {
  try {
    console.log('🔍 PATCH /api/cart/update - Dados recebidos:', req.body);

    const origin = req.headers.origin;
    if (origin) {
      console.log(`CORS Debug - Origin: ${origin}, Method: ${req.method}, Path: ${req.originalUrl}`);
    }

    const userId = req.user?.id;
    const { cart_item_id, quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado', code: 'UNAUTHENTICATED' });
    }

    if (!cart_item_id || !quantity || quantity < 1) {
      return res.status(400).json({ success: false, error: 'cart_item_id e quantidade válidos são obrigatórios', code: 'INVALID_REQUEST' });
    }

    // Buscar item garantindo que pertence ao carrinho do usuário e obter estoque da variant
    const { data: cartItem, error: cartError } = await supabaseAdmin
      .from('cart_items')
      .select(`
        id,
        cart_id,
        quantity,
        product_variant_id,
        carts!inner(user_id),
        product_variants!inner(id, stock)
      `)
      .eq('id', cart_item_id)
      .eq('carts.user_id', userId)
      .single();

    if (cartError || !cartItem) {
      return res.status(404).json({ success: false, error: 'Item não encontrado no carrinho', code: 'CART_ITEM_NOT_FOUND' });
    }

    if (quantity > (cartItem.product_variants?.stock ?? 0)) {
      return res.status(400).json({ success: false, error: 'Quantidade maior que o estoque disponível da variant', code: 'QUANTITY_EXCEEDS_STOCK' });
    }

    const { data: updatedItem, error } = await supabaseAdmin
      .from('cart_items')
      .update({ quantity })
      .eq('id', cart_item_id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar carrinho:', error);
      return res.status(500).json({ success: false, error: 'Erro ao atualizar item do carrinho', code: 'CART_ITEM_UPDATE_FAILED' });
    }

    res.json({ success: true, cart_item: updatedItem });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/cart/item?id=xxxx
 * Remove um item do carrinho
 */
router.delete('/item', authenticateSupabaseGoogleUser, async (req, res, next) => {
  try {
    console.log('🔍 DELETE /api/cart/item - Parâmetros recebidos:', req.query);

    const origin = req.headers.origin;
    if (origin) {
      console.log(`CORS Debug - Origin: ${origin}, Method: ${req.method}, Path: ${req.originalUrl}`);
    }

    const userId = req.user?.id;
    const itemId = req.query.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado', code: 'UNAUTHENTICATED' });
    }
    if (!itemId) {
      return res.status(400).json({ success: false, error: 'Parâmetro id é obrigatório', code: 'MISSING_ITEM_ID' });
    }

    // Validar que o item pertence ao carrinho do usuário
    const { data: itemRow } = await supabaseAdmin
      .from('cart_items')
      .select('id, carts!inner(user_id)')
      .eq('id', itemId)
      .eq('carts.user_id', userId)
      .maybeSingle();

    if (!itemRow) {
      return res.status(404).json({ success: false, error: 'Item não encontrado no carrinho', code: 'CART_ITEM_NOT_FOUND' });
    }

    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Erro ao remover item do carrinho:', error);
      return res.status(500).json({ success: false, error: 'Erro ao remover item do carrinho', code: 'CART_ITEM_DELETE_FAILED' });
    }

    const { data: cartRows, error: cartErr } = await supabaseAdmin
      .from('cart_items')
      .select(`
        id,
        cart_id,
        product_variant_id,
        quantity,
        price,
        carts!inner(id),
        product_variants!inner(
          id,
          product_id,
          color,
          size,
          price,
          discounted_price,
          has_discount,
          stock,
          image_url,
          products(*)
        )
      `)
      .eq('carts.user_id', userId);

    if (cartErr) {
      console.error('Erro ao buscar itens do carrinho após remoção:', cartErr);
      return res.json({ success: true, message: 'Item removido do carrinho' });
    }

    const subtotal = (cartRows || []).reduce((sum, item) => {
      const price = Number(item.price) || 0;
      return sum + price * item.quantity;
    }, 0);

    const itemsCount = (cartRows || []).reduce((sum, item) => sum + item.quantity, 0);

    const formatted = (cartRows || []).map(item => {
      const v = item.product_variants || null;
      const p = v?.products || null;
      const imageCandidate = (v?.image_url ?? (Array.isArray(p?.images) ? p.images[0] : null)) ?? null;
      return {
        item_id: item.id,
        quantity: item.quantity,
        price: Number(item.price) || 0,
        color: v?.color || null,
        size: v?.size || null,
        image_url: imageCandidate,
        product_name: p?.name || null,
        product_id: v?.product_id || null,
        product_variant_id: item.product_variant_id
      };
    });

    res.json({
      success: true,
      cart: {
        items: formatted,
        subtotal,
        items_count: itemsCount
      }
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/', authenticateSupabaseGoogleUser, async (req, res, next) => {
  try {
    console.log('🔍 DELETE /api/cart - Limpar carrinho');

    const origin = req.headers.origin;
    if (origin) {
      console.log(`CORS Debug - Origin: ${origin}, Method: ${req.method}, Path: ${req.originalUrl}`);
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado', code: 'UNAUTHENTICATED' });
    }

    // Obter carrinho do usuário
    const { data: cart } = await supabaseAdmin
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!cart?.id) {
      return res.json({ success: true, message: 'Carrinho já está vazio' });
    }

    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

    if (error) {
      console.error('Erro ao limpar carrinho:', error);
      return res.status(500).json({ success: false, error: 'Erro ao limpar carrinho', code: 'CART_CLEAR_FAILED' });
    }

    res.json({ success: true, message: 'Carrinho limpo com sucesso' });
  } catch (error) {
    next(error);
  }
});

// Endpoint de contrato para debug, espelhando estilo do google-separated
router.get('/debug/contract', (req, res) => {
  console.log('📄 GET /api/cart/debug/contract - Contrato do carrinho');
  res.json({
    route: '/api/cart',
    version: '1.0.0',
    auth: 'Authorization: Bearer <supabase_token>',
    endpoints: {
      add: { method: 'POST', path: '/api/cart/add', body: { product_variant_id: 'uuid', quantity: 'number>0' } },
      get: { method: 'GET', path: '/api/cart' },
      update: { method: 'PATCH', path: '/api/cart/update', body: { cart_item_id: 'uuid', quantity: 'number>=1' } },
      delete_item: { method: 'DELETE', path: '/api/cart/item?id=<uuid>' },
      clear: { method: 'DELETE', path: '/api/cart' }
    },
    errors: {
      UNAUTHENTICATED: '401 Usuário não autenticado',
      MISSING_PRODUCT_VARIANT_ID: '400 product_variant_id é obrigatório',
      INVALID_VARIANT_ID: '400 ID da variant inválido',
      INVALID_QUANTITY: '400 quantidade deve ser > 0',
      VARIANT_NOT_FOUND: '404 variant não encontrada',
      QUANTITY_EXCEEDS_STOCK: '400 quantidade maior que estoque',
      CART_CREATE_FAILED: '500 erro ao criar carrinho',
      CART_ITEM_ADD_FAILED: '500 erro ao adicionar item',
      CART_FETCH_FAILED: '500 erro ao buscar itens do carrinho',
      CART_ITEM_NOT_FOUND: '404 item não encontrado',
      CART_ITEM_UPDATE_FAILED: '500 erro ao atualizar item',
      MISSING_ITEM_ID: '400 parâmetro id é obrigatório',
      CART_ITEM_DELETE_FAILED: '500 erro ao remover item',
      CART_CLEAR_FAILED: '500 erro ao limpar carrinho'
    }
  });
});

module.exports = router;