const express = require('express');
const { supabase } = require('../config/supabase');
const crypto = require('crypto');
const router = express.Router();

/**
 * POST /webhook/payment
 * Recebe confirmações de pagamento de gateways (Stripe, Mercado Pago, etc.)
 */
router.post('/payment', async (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'] || req.headers['x-signature'];
    const payload = req.body;

    // Verificar assinatura do webhook (segurança)
    if (process.env.PAYMENT_WEBHOOK_SECRET) {
      const isValidSignature = verifyWebhookSignature(payload, signature, process.env.PAYMENT_WEBHOOK_SECRET);
      if (!isValidSignature) {
        return res.status(401).json({
          error: 'Assinatura do webhook inválida',
          code: 'INVALID_WEBHOOK_SIGNATURE'
        });
      }
    }

    // Parse do payload se for string
    let webhookData;
    if (typeof payload === 'string') {
      try {
        webhookData = JSON.parse(payload);
      } catch (parseError) {
        return res.status(400).json({
          error: 'Payload inválido',
          code: 'INVALID_PAYLOAD'
        });
      }
    } else {
      webhookData = payload;
    }

    // Processar diferentes tipos de eventos
    const eventType = webhookData.type || webhookData.event_type || webhookData.action;
    const orderId = extractOrderId(webhookData);

    if (!orderId) {
      return res.status(400).json({
        error: 'ID do pedido não encontrado no webhook',
        code: 'MISSING_ORDER_ID'
      });
    }

    console.log(`Webhook recebido: ${eventType} para pedido ${orderId}`);

    switch (eventType) {
      case 'payment.approved':
      case 'payment_intent.succeeded':
      case 'charge.succeeded':
        await handlePaymentApproved(orderId, webhookData);
        break;

      case 'payment.rejected':
      case 'payment_intent.payment_failed':
      case 'charge.failed':
        await handlePaymentRejected(orderId, webhookData);
        break;

      case 'payment.refunded':
      case 'charge.refunded':
        await handlePaymentRefunded(orderId, webhookData);
        break;

      default:
        console.log(`Evento não processado: ${eventType}`);
        break;
    }

    res.status(200).json({ 
      message: 'Webhook processado com sucesso',
      order_id: orderId,
      event_type: eventType
    });
  } catch (error) {
    console.error('Erro no webhook de pagamento:', error);
    next(error);
  }
});

/**
 * POST /webhook/shipping
 * Recebe atualizações de status de envio
 */
router.post('/shipping', async (req, res, next) => {
  try {
    const { order_id, status, tracking_code, estimated_delivery } = req.body;

    if (!order_id) {
      return res.status(400).json({
        error: 'ID do pedido é obrigatório',
        code: 'MISSING_ORDER_ID'
      });
    }

    // Mapear status de envio
    const statusMap = {
      'shipped': 'enviado',
      'in_transit': 'em_transito',
      'delivered': 'entregue',
      'returned': 'devolvido'
    };

    const mappedStatus = statusMap[status] || status;

    // Atualizar pedido
    const updateData = {
      status: mappedStatus,
      updated_at: new Date().toISOString()
    };

    if (tracking_code) {
      updateData.tracking_code = tracking_code;
    }

    if (estimated_delivery) {
      updateData.estimated_delivery = estimated_delivery;
    }

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order_id)
      .select()
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

    console.log(`Status de envio atualizado: ${order_id} -> ${mappedStatus}`);

    res.json({
      message: 'Status de envio atualizado com sucesso',
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        tracking_code: updatedOrder.tracking_code
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Função para verificar assinatura do webhook
 */
function verifyWebhookSignature(payload, signature, secret) {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    return false;
  }
}

/**
 * Extrair ID do pedido do payload do webhook
 */
function extractOrderId(webhookData) {
  // Diferentes gateways podem enviar o order_id em locais diferentes
  return webhookData.order_id ||
         webhookData.external_reference ||
         webhookData.metadata?.order_id ||
         webhookData.data?.object?.metadata?.order_id ||
         null;
}

/**
 * Processar pagamento aprovado
 */
async function handlePaymentApproved(orderId, webhookData) {
  try {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      throw new Error(`Pedido não encontrado: ${orderId}`);
    }

    if (order.status === 'pago') {
      console.log(`Pedido ${orderId} já está marcado como pago`);
      return;
    }

    // Atualizar status do pedido
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'pago',
        payment_confirmed_at: new Date().toISOString(),
        payment_data: webhookData,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Pagamento aprovado para pedido ${orderId}`);
  } catch (error) {
    console.error('Erro ao processar pagamento aprovado:', error);
    throw error;
  }
}

/**
 * Processar pagamento rejeitado
 */
async function handlePaymentRejected(orderId, webhookData) {
  try {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      throw new Error(`Pedido não encontrado: ${orderId}`);
    }

    // Atualizar status do pedido
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'pagamento_rejeitado',
        payment_rejected_at: new Date().toISOString(),
        payment_data: webhookData,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    // Restaurar estoque
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item.product_id && item.quantity) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();

          if (product) {
            await supabase
              .from('products')
              .update({ stock: product.stock + item.quantity })
              .eq('id', item.product_id);
          }
        }
      }
    }

    console.log(`Pagamento rejeitado para pedido ${orderId}`);
  } catch (error) {
    console.error('Erro ao processar pagamento rejeitado:', error);
    throw error;
  }
}

/**
 * Processar reembolso
 */
async function handlePaymentRefunded(orderId, webhookData) {
  try {
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'reembolsado',
        refunded_at: new Date().toISOString(),
        payment_data: webhookData,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Reembolso processado para pedido ${orderId}`);
  } catch (error) {
    console.error('Erro ao processar reembolso:', error);
    throw error;
  }
}

module.exports = router;