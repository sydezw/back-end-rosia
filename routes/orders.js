const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const router = express.Router();

function formatShippingAddress(addr) {
  if (!addr || typeof addr !== 'object') return null;
  const street = [addr.logradouro, addr.numero].filter(Boolean).join(', ');
  const district = addr.bairro || null;
  const cityState = [addr.cidade, addr.estado].filter(Boolean).join(' - ');
  const cep = addr.cep || null;
  const complemento = addr.complemento || null;
  return [street, district, cityState, cep, complemento].filter(Boolean).join(' | ');
}

/**
 * GET /orders
 * Lista todos os pedidos do usuário autenticado
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Filtro por status
    if (status) {
      query = query.eq('status', status);
    }

    // Paginação
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error } = await query;

    if (error) {
      throw error;
    }

    // Buscar total de pedidos para paginação
    let countQuery = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count: totalCount } = await countQuery;

    // Formatar resposta
    const formattedOrders = orders.map(order => ({
      id: order.id,
      total: order.total,
      status: order.status,
      items_count: order.items ? order.items.length : 0,
      created_at: order.created_at,
      updated_at: order.updated_at,
      payment_method: order.payment_method
    }));

    res.json({
      orders: formattedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /orders/:id
 * Busca detalhes de um pedido específico
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .or(`id.eq.${id},external_reference.eq.${id},payment_id.eq.${id}`)
      .maybeSingle();

    if (error || !order) {
      return res.status(404).json({
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      });
    }

    let items = Array.isArray(order.items) ? order.items : [];

    if (!items || items.length === 0) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      if (Array.isArray(orderItems)) {
        items = orderItems.map(it => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          product_price: Number(it.unit_price),
          total: Number(it.unit_price) * Number(it.quantity),
          size: it.selected_size || null,
          color: it.selected_color || null
        }));
      }
    } else {
      items = items.map(it => ({
        product_id: it.product_id,
        product_name: it.product_name,
        quantity: it.quantity,
        product_price: it.product_price ?? it.unit_price,
        total: it.total ?? (it.unit_price && it.quantity ? Number(it.unit_price) * Number(it.quantity) : it.total),
        size: it.size ?? it.selected_size ?? null,
        color: it.color ?? it.selected_color ?? null
      }));
    }

    const orderDetails = {
      id: order.id,
      external_reference: order.external_reference || order.payment_id || order.id,
      status: order.payment_status || order.status,
      subtotal: order.subtotal,
      shipping_cost: order.shipping_cost,
      total: order.total,
      payment_method: order.payment_method,
      shipping_address: order.shipping_address,
      shipping_address_formatted: formatShippingAddress(order.shipping_address),
      items,
      created_at: order.created_at,
      updated_at: order.updated_at,
      tracking_code: order.tracking_code || null,
      estimated_delivery: order.estimated_delivery || null
    };

    res.json({ order: orderDetails });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/address', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, user_id, shipping_address')
      .eq('user_id', userId)
      .or(`id.eq.${id},external_reference.eq.${id},payment_id.eq.${id}`)
      .maybeSingle();

    if (error || !order) {
      return res.status(404).json({
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      });
    }

    const address = order.shipping_address || null;
    const formatted = formatShippingAddress(address);

    res.json({
      address: address,
      formatted: formatted,
      order_id: order.id
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /orders/:id/cancel
 * Cancela um pedido (apenas se status for 'pendente')
 */
router.put('/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Validar se ID é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'ID do pedido inválido',
        code: 'INVALID_ORDER_ID'
      });
    }

    // Buscar pedido
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Pedido não encontrado',
          code: 'ORDER_NOT_FOUND'
        });
      }
      throw fetchError;
    }

    // Verificar se pedido pode ser cancelado
    if (order.status !== 'pendente') {
      return res.status(400).json({
        error: 'Apenas pedidos pendentes podem ser cancelados',
        code: 'CANNOT_CANCEL_ORDER',
        current_status: order.status
      });
    }

    // Atualizar status do pedido
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelado',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Restaurar estoque dos produtos
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item.product_id && item.quantity) {
          // Buscar produto atual
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();

          if (!productError && product) {
            // Restaurar estoque
            const { error: stockError } = await supabase
              .from('products')
              .update({ stock: product.stock + item.quantity })
              .eq('id', item.product_id);

            if (stockError) {
              console.error('Erro ao restaurar estoque:', stockError);
            }
          }
        }
      }
    }

    res.json({
      message: 'Pedido cancelado com sucesso',
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updated_at: updatedOrder.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /orders/status/summary
 * Retorna resumo dos pedidos por status
 */
router.get('/status/summary', async (req, res, next) => {
  try {
    const userId = req.userId;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('status')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // Contar pedidos por status
    const summary = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    res.json({ summary });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/tracking', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { data: order, error } = await supabase
      .from('orders')
      .select('id,status,tracking_code,estimated_delivery,updated_at,created_at')
      .eq('user_id', userId)
      .or(`id.eq.${id},external_reference.eq.${id}`)
      .maybeSingle();
    if (error || !order) {
      return res.status(404).json({ error: 'Pedido não encontrado', code: 'ORDER_NOT_FOUND' });
    }
    return res.json({
      tracking: {
        order_id: order.id,
        status: order.status,
        tracking_code: order.tracking_code || null,
        estimated_delivery: order.estimated_delivery || null,
        updated_at: order.updated_at,
        created_at: order.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/reorder', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .single();
    if (orderErr || !order) {
      return res.status(404).json({ error: 'Pedido não encontrado', code: 'ORDER_NOT_FOUND' });
    }
    let items = Array.isArray(order.items) ? order.items : [];
    if (!items || items.length === 0) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      items = (orderItems || []).map(it => ({
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
        selected_size: it.selected_size || null,
        selected_color: it.selected_color || null
      }));
    }
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
        return res.status(500).json({ error: 'Erro ao preparar carrinho', code: 'CART_CREATE_FAILED' });
      }
      cartId = newCart.id;
    }
    const added = [];
    const skipped = [];
    for (const it of items) {
      const pid = it.product_id;
      const color = it.color ?? it.selected_color ?? null;
      const size = it.size ?? it.selected_size ?? null;
      let variant;
      if (color || size) {
        const { data: v } = await supabaseAdmin
          .from('product_variants')
          .select('id, price, discounted_price, has_discount, stock')
          .eq('product_id', pid)
          .eq('color', color)
          .eq('size', size)
          .maybeSingle();
        variant = v || null;
      }
      if (!variant) {
        const { data: v2 } = await supabaseAdmin
          .from('product_variants')
          .select('id, price, discounted_price, has_discount, stock')
          .eq('product_id', pid)
          .limit(1)
          .maybeSingle();
        variant = v2 || null;
      }
      if (!variant) {
        skipped.push({ product_id: pid });
        continue;
      }
      const priceAtPurchase = variant.has_discount ? (variant.discounted_price ?? variant.price) : variant.price;
      const { data: existingItem } = await supabaseAdmin
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('product_variant_id', variant.id)
        .maybeSingle();
      if (existingItem) {
        const newQty = existingItem.quantity + (Number(it.quantity) || 1);
        if (variant.stock < newQty) {
          skipped.push({ product_variant_id: variant.id, reason: 'OUT_OF_STOCK' });
          continue;
        }
        const { data: updated } = await supabaseAdmin
          .from('cart_items')
          .update({ quantity: newQty })
          .eq('id', existingItem.id)
          .select()
          .single();
        if (updated) added.push(updated);
      } else {
        if (variant.stock < (Number(it.quantity) || 1)) {
          skipped.push({ product_variant_id: variant.id, reason: 'OUT_OF_STOCK' });
          continue;
        }
        const { data: inserted } = await supabaseAdmin
          .from('cart_items')
          .insert({
            cart_id: cartId,
            product_variant_id: variant.id,
            quantity: Number(it.quantity) || 1,
            price: priceAtPurchase
          })
          .select()
          .single();
        if (inserted) added.push(inserted);
      }
    }
    return res.status(201).json({ success: true, cart_id: cartId, added_count: added.length, skipped });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

