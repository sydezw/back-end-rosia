const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateSupabaseGoogleUser } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

async function calculateShipping(cep, items) {
  // Simples cálculo de frete (igual ao checkout.js)
  const base = 15.0;
  const weightMultiplier = 2.0; // R$2 por item como aproximação
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = items.reduce((sum, it) => sum + (it.product_price * it.quantity), 0);

  let shipping = base + itemCount * weightMultiplier;
  if (subtotal >= 100) shipping = 0;
  return shipping;
}

/**
 * POST /order/checkout
 * Cria um pedido a partir dos itens do carrinho do usuário Google
 * Body: { shipping_address: { cep, logradouro, numero, bairro, cidade, estado, complemento }, payment_method }
 */
router.post('/checkout', authenticateSupabaseGoogleUser, async (req, res, next) => {
  try {
    const googleUserId = req.user?.id; // google_user_profiles.id
    const supabaseAuthUserId = req.supabaseUser?.id; // auth.users.id
    const googleEmail = req.user?.email;
    const { shipping_address, payment_method = 'pix' } = req.body || {};

    if (!googleUserId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }
    if (!supabaseAuthUserId) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    console.log('[order/checkout] userId:', googleUserId);

    // Buscar itens do carrinho do usuário Google com aliases de FK (admin client)
    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from('cart_items')
      .select(`
        id,
        quantity,
        price,
        cart_id,
        carts!inner(user_id),
        product_variants:product_variant_id(
          id,
          stock,
          price,
          discounted_price,
          has_discount,
          size,
          color,
          products:product_id(
            id,
            name,
            is_active
          )
        )
      `)
      .eq('carts.user_id', googleUserId);

    console.log('[order/checkout] cartErr:', cartError);
    console.log('[order/checkout] cartItems length:', Array.isArray(cartItems) ? cartItems.length : cartItems);

    if (cartError) {
      console.error('Erro ao buscar carrinho:', cartError);
      return res.status(500).json({ success: false, error: 'Erro ao buscar itens do carrinho' });
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Carrinho vazio' });
    }

    // Validar estoque e preparar itens do pedido
    const orderItems = [];
    let subtotal = 0;

    for (const item of cartItems) {
      const variant = item.product_variants;
      const product = variant?.products;

      if (!product || !product.is_active) {
        return res.status(400).json({ success: false, error: 'Produto inativo ou inexistente' });
      }

      if ((variant?.stock ?? 0) < item.quantity) {
        return res.status(400).json({ success: false, error: `Estoque insuficiente para ${product.name}. Disponível: ${variant?.stock ?? 0}` });
      }

      const unitPrice = Number(item.price ?? (variant?.has_discount ? variant?.discounted_price : variant?.price));
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product_id: product.id,
        product_variant_id: variant.id,
        product_name: product.name,
        product_price: unitPrice,
        quantity: item.quantity,
        total: itemTotal,
        available_stock: variant.stock,
        size: variant.size ?? item.size,
        color: variant.color ?? item.color
      });
    }

    // Calcular frete
    const shippingCost = await calculateShipping(shipping_address?.cep || null, orderItems);
    const total = subtotal + shippingCost;

    // Criar pedido na tabela orders (sem os itens)
    const orderId = uuidv4();
    let userInfo = null;
    try {
      const { data: profile } = await supabaseAdmin
        .from('google_user_profiles')
        .select('id, email, nome, telefone, cpf, data_nascimento')
        .eq('id', googleUserId)
        .maybeSingle();
      if (profile) {
        userInfo = {
          source: 'google_user_profiles',
          id: profile.id,
          email: profile.email || googleEmail || null,
          nome: profile.nome || null,
          telefone: profile.telefone || null,
          cpf: profile.cpf || null,
          data_nascimento: profile.data_nascimento || null
        };
      }
    } catch {}
    const orderPayload = {
      id: orderId,
      user_id: supabaseAuthUserId,
      items: orderItems,
      subtotal,
      shipping_cost: shippingCost,
      total,
      status: 'pendente',
      payment_method: payment_method === 'credit_card' ? 'cartao_credito' : payment_method,
      shipping_address: shipping_address || {},
      google_user_profile_id: googleUserId || null,
      user_info: userInfo,
      external_reference: orderId,
      created_at: new Date().toISOString()
    };

    const { data: createdOrder, error: createOrderError } = await supabaseAdmin
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();

    if (createOrderError) {
      console.error('Erro ao criar pedido principal:', createOrderError);
      return res.status(500).json({ success: false, error: 'Erro ao criar pedido' });
    }

    // Inserir itens na tabela order_items (alinhado ao schema)
    const orderItemsToInsert = orderItems.map(item => ({
      order_id: createdOrder.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.product_price,
      selected_size: item.size,
      selected_color: item.color,
      product_name: item.product_name
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) {
      console.error('Erro ao inserir itens do pedido:', itemsError);
      // Tentar reverter o pedido principal em caso de falha
      await supabaseAdmin.from('orders').delete().eq('id', createdOrder.id);
      return res.status(500).json({ success: false, error: 'Erro ao salvar itens do pedido' });
    }

    // Atualizar estoque real das variants (via admin para evitar RLS)
    for (const item of orderItems) {
      const { data: currentVariant, error: fetchVarErr } = await supabaseAdmin
        .from('product_variants')
        .select('stock')
        .eq('id', item.product_variant_id)
        .single();
      if (fetchVarErr || currentVariant == null) {
        console.error('Erro ao buscar estoque atual da variant:', fetchVarErr);
        return res.status(500).json({ success: false, error: 'Erro ao atualizar estoque da variant' });
      }
      const newVariantStock = (currentVariant.stock || 0) - item.quantity;
      const { error: updateVarErr } = await supabaseAdmin
        .from('product_variants')
        .update({ stock: newVariantStock, updated_at: new Date().toISOString() })
        .eq('id', item.product_variant_id);
      if (updateVarErr) {
        console.error('Erro ao atualizar estoque da variant:', updateVarErr);
        return res.status(500).json({ success: false, error: 'Erro ao atualizar estoque da variant' });
      }
    }

    // Limpar o carrinho do usuário Google (via admin)
    const { data: userCart } = await supabaseAdmin
      .from('carts')
      .select('id')
      .eq('user_id', googleUserId)
      .maybeSingle();
    if (userCart?.id) {
      const { error: clearError } = await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('cart_id', userCart.id);
      if (clearError) {
        console.error('Erro ao limpar carrinho:', clearError);
        // Não falhar o pedido por isso; apenas logar
      }
    }

    res.status(201).json({ success: true, order: createdOrder });
  } catch (error) {
    next(error);
  }
});

module.exports = router;