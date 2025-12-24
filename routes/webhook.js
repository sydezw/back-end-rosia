const express = require('express');
const { supabase } = require('../config/supabase');
const crypto = require('crypto');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const router = express.Router();

const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN });
const mpPayment = new Payment(mpClient);

/**
 * POST /webhook/payment
 * Recebe confirmações de pagamento de gateways (Stripe, Mercado Pago, etc.)
 */
router.post('/payment', async (req, res, next) => {
  try {
    console.log('🔥 WEBHOOK RECEBIDO:', Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body);
    console.log({ event: req.body?.type, status: req.body?.data?.status, paymentId: req.body?.data?.id });
    const signature = req.headers['x-signature'] || req.headers['x-webhook-signature'];
    const requestId = req.headers['x-request-id'];
    const secret = process.env.MP_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET;
    if (secret && signature && requestId) {
      const bodyString = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const payload = `${requestId}.${bodyString}`;
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      if (expected !== signature) {
        console.warn('Assinatura inválida no webhook /webhook/payment – continuando como público');
      }
    } else {
      console.warn('Webhook payment sem assinatura – rota pública aceita');
    }

    // Parse do payload se for string
    let webhookData;
    if (typeof req.body === 'string') {
      try {
        webhookData = JSON.parse(req.body);
      } catch (parseError) {
        return res.status(400).json({
          error: 'Payload inválido',
          code: 'INVALID_PAYLOAD'
        });
      }
    } else {
      webhookData = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
    }

    // Processar diferentes tipos de eventos
    const eventType = webhookData.type || webhookData.event_type || webhookData.action;
    
    // Verificar se é webhook do Mercado Pago por diferentes formatos
    const mpCandidateId = (webhookData?.data?.id)
      || (typeof webhookData?.resource === 'string' ? webhookData.resource.split('/').pop() : undefined)
      || webhookData?.id;
    if (mpCandidateId) {
      console.log('Recebi Webhook para o pagamento:', mpCandidateId);
      return await handleMercadoPagoWebhook(webhookData, res);
    }
    
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

router.post('/mercadopago', async (req, res) => {
  try {
    console.log('🔥 WEBHOOK RECEBIDO:', Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body);
    console.log({ event: req.body?.type, status: req.body?.data?.status, paymentId: req.body?.data?.id });
    const signature = req.headers['x-signature'] || req.headers['x-webhook-signature'];
    const requestId = req.headers['x-request-id'];
    const secret = process.env.MP_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET;
    if (secret && signature && requestId) {
      const bodyString = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const payloadStr = `${requestId}.${bodyString}`;
      const expected = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
      if (expected !== signature) {
        const isTest = bodyString.includes('"live_mode":false');
        if (isTest) {
          console.warn('Assinatura de TESTE inválida, permitida para simulação');
        } else {
          console.error('Assinatura de PRODUÇÃO inválida – continuando como público');
        }
      }
    } else {
      console.warn('Webhook Mercado Pago sem assinatura – rota pública aceita');
    }
    const payload = Buffer.isBuffer(req.body)
      ? JSON.parse(req.body.toString('utf8'))
      : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
    const { type, data } = payload || {};
    if (payload && payload.live_mode === false) {
      console.log('🧪 Webhook de teste (live_mode=false) aceito sem validação');
      return res.status(200).json({ message: 'Webhook de teste recebido', payload: { type, data } });
    }
    if (type === 'payment' && data && data.id) {
      return await handleMercadoPagoWebhook(payload, res);
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error('Erro webhook MP:', err);
    return res.sendStatus(500);
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

/**
 * Processar webhook específico do Mercado Pago
 */
async function handleMercadoPagoWebhook(webhookData, res) {
  try {
    const paymentId = webhookData.data?.id || webhookData.id;
    if (!paymentId || paymentId === '123456') {
      return res.status(200).send('OK');
    }

    console.log(`🔎 Processando pagamento MP: ${paymentId}`);

    let paymentData;
    try {
      const paymentRes = await mpPayment.get({ id: String(paymentId) });
      paymentData = paymentRes.body || paymentRes;
    } catch (apiError) {
      return res.status(200).send('Pagamento não encontrado na API do MP');
    }

    const orderId = paymentData.external_reference;
    if (!orderId) return res.status(200).send('Sem referência de pedido');

    let order = null;
    let attempts = 0;
    const maxAttempts = 5;
    while (!order && attempts < maxAttempts) {
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .or(`id.eq.${orderId},external_reference.eq.${orderId}`)
        .maybeSingle();
      if (data) {
        order = data;
      } else {
        attempts++;
        console.log(`⏳ Tentativa ${attempts}: Pedido ${orderId} não achado. Esperando 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!order) {
      console.error(`❌ Erro crítico: Pedido ${orderId} não apareceu no banco após 10s.`);
      return res.status(200).send('Pedido não encontrado no banco de dados');
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: paymentData.status === 'approved' ? 'pago' :
                paymentData.status === 'rejected' ? 'rejected' : 'pendente',
        payment_id: String(paymentId),
        payment_status: paymentData.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    console.log(`✅ Pedido ${orderId} atualizado com sucesso via Webhook.`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Erro no webhook:', error.message);
    return res.status(500).json({ error: 'Erro interno ao processar webhook' });
  }
}

module.exports = router;

