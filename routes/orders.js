const express = require('express');
const { supabase } = require('../config/supabase');
const router = express.Router();

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
      }
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

    // Validar se ID é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'ID do pedido inválido',
        code: 'INVALID_ORDER_ID'
      });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Pedido não encontrado',
          code: 'ORDER_NOT_FOUND'
        });
      }
      throw error;
    }

    // Formatar resposta com detalhes completos
    const orderDetails = {
      id: order.id,
      status: order.status,
      payment_method: order.payment_method,
      subtotal: order.subtotal,
      shipping_cost: order.shipping_cost,
      total: order.total,
      items: order.items,
      shipping_address: order.shipping_address,
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

module.exports = router;

