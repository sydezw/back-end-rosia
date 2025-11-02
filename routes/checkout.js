const express = require('express');
const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

/**
 * POST /checkout/create
 * Cria um novo pedido a partir do carrinho
 */
router.post('/create', async (req, res, next) => {
  try {
    const { items, shipping_address, payment_method } = req.body;
    const userId = req.userId;

    // Validações básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Carrinho vazio ou inválido',
        code: 'INVALID_CART'
      });
    }

    if (!shipping_address || !shipping_address.cep || !shipping_address.logradouro) {
      return res.status(400).json({
        error: 'Endereço de entrega obrigatório',
        code: 'MISSING_ADDRESS'
      });
    }

    // Validar e buscar produtos
    const productIds = items.map(item => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('active', true);

    if (productsError) {
      throw productsError;
    }

    if (products.length !== productIds.length) {
      return res.status(400).json({
        error: 'Um ou mais produtos não foram encontrados',
        code: 'PRODUCTS_NOT_FOUND'
      });
    }

    // Validar estoque e calcular totais
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.product_id);
      
      if (!product) {
        return res.status(400).json({
          error: `Produto ${item.product_id} não encontrado`,
          code: 'PRODUCT_NOT_FOUND'
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}`,
          code: 'INSUFFICIENT_STOCK'
        });
      }

      if (item.quantity <= 0) {
        return res.status(400).json({
          error: 'Quantidade deve ser maior que zero',
          code: 'INVALID_QUANTITY'
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity: item.quantity,
        total: itemTotal
      });
    }

    // Calcular frete (simulado - você pode integrar com API real)
    const shippingCost = await calculateShipping(shipping_address.cep, items);
    const total = subtotal + shippingCost;

    // Criar pedido
    const orderId = uuidv4();
    const orderData = {
      id: orderId,
      user_id: userId,
      items: orderItems,
      subtotal: subtotal,
      shipping_cost: shippingCost,
      total: total,
      status: 'pendente',
      payment_method: payment_method || 'pix',
      shipping_address: shipping_address,
      created_at: new Date().toISOString()
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // Atualizar estoque dos produtos
    for (const item of items) {
      const product = products.find(p => p.id === item.product_id);
      const newStock = product.stock - item.quantity;

      const { error: stockError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.product_id);

      if (stockError) {
        console.error('Erro ao atualizar estoque:', stockError);
        // Em produção, você pode querer reverter o pedido aqui
      }
    }

    res.status(201).json({
      message: 'Pedido criado com sucesso',
      order: {
        id: order.id,
        total: order.total,
        status: order.status,
        items: order.items,
        shipping_address: order.shipping_address,
        created_at: order.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /checkout/validate
 * Valida carrinho antes do checkout (sem criar pedido)
 */
router.post('/validate', async (req, res, next) => {
  try {
    const { items, cep } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Carrinho vazio ou inválido',
        code: 'INVALID_CART'
      });
    }

    // Buscar produtos
    const productIds = items.map(item => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('active', true);

    if (productsError) {
      throw productsError;
    }

    // Validar disponibilidade e calcular totais
    let subtotal = 0;
    const validationErrors = [];
    const validatedItems = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.product_id);
      
      if (!product) {
        validationErrors.push(`Produto ${item.product_id} não encontrado`);
        continue;
      }

      if (product.stock < item.quantity) {
        validationErrors.push(`Estoque insuficiente para ${product.name}. Disponível: ${product.stock}`);
        continue;
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        available_stock: product.stock
      });
    }

    // Calcular frete se CEP fornecido
    let shippingCost = 0;
    if (cep) {
      shippingCost = await calculateShipping(cep, items);
    }

    const total = subtotal + shippingCost;

    res.json({
      valid: validationErrors.length === 0,
      errors: validationErrors,
      summary: {
        subtotal,
        shipping_cost: shippingCost,
        total,
        items_count: validatedItems.length
      },
      items: validatedItems
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Função auxiliar para calcular frete
 * Em produção, integre com API real dos Correios ou transportadora
 */
async function calculateShipping(cep, items) {
  try {
    // Simulação simples de cálculo de frete
    const baseShipping = 15.00; // Frete base
    const weightMultiplier = 0.5; // R$ por item adicional
    
    // Calcular peso total baseado na quantidade de itens
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const additionalCost = Math.max(0, (totalItems - 1) * weightMultiplier);
    
    // Frete grátis para pedidos acima de R$ 100
    const itemsValue = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    if (itemsValue >= 100) {
      return 0;
    }
    
    return baseShipping + additionalCost;
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    return 15.00; // Frete padrão em caso de erro
  }
}

module.exports = router;

