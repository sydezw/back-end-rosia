const express = require('express');
const { getMercadoPago } = require('../config/mercadopago');
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * POST /payment/card-token
 * Cria token de cartão para checkout transparente
 */
router.post('/card-token', async (req, res, next) => {
  try {
    const {
      card_number,
      expiration_month,
      expiration_year,
      security_code,
      cardholder_name,
      cardholder_document_type,
      cardholder_document_number
    } = req.body;

    // Validações básicas
    if (!card_number || !expiration_month || !expiration_year || !security_code || !cardholder_name) {
      return res.status(400).json({
        error: 'Dados do cartão incompletos',
        code: 'INCOMPLETE_CARD_DATA',
        required_fields: ['card_number', 'expiration_month', 'expiration_year', 'security_code', 'cardholder_name']
      });
    }

    const mercadoPago = getMercadoPago();
    
    const cardData = {
      card_number: card_number.replace(/\s/g, ''), // Remove espaços
      expiration_month: parseInt(expiration_month),
      expiration_year: parseInt(expiration_year),
      security_code,
      cardholder_name,
      cardholder_document_type: cardholder_document_type || 'CPF',
      cardholder_document_number: cardholder_document_number?.replace(/\D/g, '') // Remove caracteres não numéricos
    };

    const tokenResponse = await mercadoPago.createCardToken(cardData);

    res.json({
      token: tokenResponse.id,
      status: tokenResponse.status,
      first_six_digits: tokenResponse.first_six_digits,
      last_four_digits: tokenResponse.last_four_digits,
      expiration_month: tokenResponse.expiration_month,
      expiration_year: tokenResponse.expiration_year,
      cardholder_name: tokenResponse.cardholder?.name
    });
  } catch (error) {
    console.error('Erro ao criar token do cartão:', error);
    
    if (error.cause && error.cause.length > 0) {
      const mpError = error.cause[0];
      return res.status(400).json({
        error: 'Erro nos dados do cartão',
        code: mpError.code,
        description: mpError.description
      });
    }

    next(error);
  }
});

/**
 * POST /payment/card
 * Processa pagamento com cartão de crédito
 */
router.post('/card', authenticateToken, async (req, res, next) => {
  try {
    const {
      token,
      transaction_amount,
      installments,
      payment_method_id,
      issuer_id,
      order_id,
      payer,
      billing_address
    } = req.body;

    // Validações
    if (!token || !transaction_amount || !payment_method_id || !order_id || !payer) {
      return res.status(400).json({
        error: 'Dados de pagamento incompletos',
        code: 'INCOMPLETE_PAYMENT_DATA',
        required_fields: ['token', 'transaction_amount', 'payment_method_id', 'order_id', 'payer']
      });
    }

    // Verificar se o pedido existe e pertence ao usuário
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', req.user.id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.status !== 'pendente') {
      return res.status(400).json({
        error: 'Pedido não pode ser pago',
        code: 'ORDER_NOT_PAYABLE',
        current_status: order.status
      });
    }

    // Verificar se o valor confere
    if (Math.abs(transaction_amount - order.total) > 0.01) {
      return res.status(400).json({
        error: 'Valor do pagamento não confere com o pedido',
        code: 'AMOUNT_MISMATCH',
        order_total: order.total,
        payment_amount: transaction_amount
      });
    }

    const mercadoPago = getMercadoPago();

    const paymentData = {
      token,
      transaction_amount,
      description: `Pedido #${order_id} - Rosita Floral Elegance`,
      installments: installments || 1,
      payment_method_id,
      issuer_id,
      external_reference: order_id,
      order_id,
      payer: {
        email: payer.email || req.user.email,
        identification: {
          type: payer.identification?.type || 'CPF',
          number: payer.identification?.number
        },
        first_name: payer.first_name || req.user.user_metadata?.first_name || '',
        last_name: payer.last_name || req.user.user_metadata?.last_name || ''
      },
      billing_address
    };

    const paymentResponse = await mercadoPago.createPayment(paymentData);

    // Atualizar pedido com dados do pagamento
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_id: paymentResponse.id,
        payment_method: 'credit_card',
        payment_status: paymentResponse.status,
        payment_data: {
          mp_payment_id: paymentResponse.id,
          status: paymentResponse.status,
          status_detail: paymentResponse.status_detail,
          payment_method_id: paymentResponse.payment_method_id,
          installments: paymentResponse.installments
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id);

    if (updateError) {
      console.error('Erro ao atualizar pedido:', updateError);
    }

    // Resposta baseada no status do pagamento
    const responseData = {
      payment_id: paymentResponse.id,
      status: paymentResponse.status,
      status_detail: paymentResponse.status_detail,
      order_id,
      transaction_amount: paymentResponse.transaction_amount,
      installments: paymentResponse.installments
    };

    // Adicionar informações específicas baseadas no status
    if (paymentResponse.status === 'approved') {
      responseData.message = 'Pagamento aprovado com sucesso!';
      
      // Atualizar status do pedido para 'pago'
      await supabase
        .from('orders')
        .update({
          status: 'pago',
          payment_confirmed_at: new Date().toISOString()
        })
        .eq('id', order_id);
        
    } else if (paymentResponse.status === 'pending') {
      responseData.message = 'Pagamento pendente de aprovação.';
      responseData.pending_reason = paymentResponse.status_detail;
      
    } else if (paymentResponse.status === 'rejected') {
      responseData.message = 'Pagamento rejeitado.';
      responseData.rejection_reason = paymentResponse.status_detail;
      
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
    }

    res.json(responseData);
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    
    if (error.cause && error.cause.length > 0) {
      const mpError = error.cause[0];
      return res.status(400).json({
        error: 'Erro no processamento do pagamento',
        code: mpError.code,
        description: mpError.description
      });
    }

    next(error);
  }
});

/**
 * GET /payment/:id
 * Consulta status de um pagamento
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar se o pagamento pertence ao usuário
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        error: 'Pagamento não encontrado',
        code: 'PAYMENT_NOT_FOUND'
      });
    }

    const mercadoPago = getMercadoPago();
    const paymentResponse = await mercadoPago.getPayment(id);

    res.json({
      payment_id: paymentResponse.id,
      status: paymentResponse.status,
      status_detail: paymentResponse.status_detail,
      order_id: order.id,
      transaction_amount: paymentResponse.transaction_amount,
      installments: paymentResponse.installments,
      payment_method_id: paymentResponse.payment_method_id,
      date_created: paymentResponse.date_created,
      date_approved: paymentResponse.date_approved
    });
  } catch (error) {
    console.error('Erro ao consultar pagamento:', error);
    next(error);
  }
});

/**
 * GET /payment/methods
 * Lista métodos de pagamento disponíveis
 */
router.get('/methods', async (req, res, next) => {
  try {
    const mercadoPago = getMercadoPago();
    const methods = await mercadoPago.getPaymentMethods();

    res.json({
      payment_methods: methods,
      public_key: mercadoPago.getPublicKey()
    });
  } catch (error) {
    console.error('Erro ao obter métodos de pagamento:', error);
    next(error);
  }
});

/**
 * GET /payment/config
 * Retorna configurações públicas do Mercado Pago
 */
router.get('/config', async (req, res, next) => {
  try {
    const mercadoPago = getMercadoPago();

    res.json({
      public_key: mercadoPago.getPublicKey(),
      configured: mercadoPago.isConfigured()
    });
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    next(error);
  }
});

module.exports = router;

