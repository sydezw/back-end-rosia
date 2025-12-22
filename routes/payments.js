const express = require('express');
const router = express.Router();
const { getMercadoPago } = require('../config/mercadopago');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateSupabaseGoogleUser } = require('../middleware/auth');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { randomUUID } = require('crypto');

/**
 * POST /mp/credit-card
 * Processa pagamento com cartão de crédito via Mercado Pago
 * Body esperado:
 * - token: string (token gerado via /payment/card-token)
 * - issuer_id: string | number (opcional)
 * - payment_method_id: string (ex.: 'visa')
 * - installments: number (ex.: 1)
 * - amount: number (valor total)
 * - email: string (email do pagador)
 */
router.post('/mp/credit-card', async (req, res, next) => {
  try {
    const {
      token,
      issuer_id,
      payment_method_id,
      installments,
      amount,
      email,
      description,
      cpf
    } = req.body;

    // Validação mínima
    if (!token || !payment_method_id || !amount || !email) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos',
        code: 'INCOMPLETE_PAYMENT_DATA',
        required_fields: ['token', 'payment_method_id', 'amount', 'email']
      });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN;
    if (!accessToken) {
      return res.json({
        success: true,
        mock: true,
        payment: {
          id: `mp_mock_${Date.now()}`,
          status: 'approved',
          transaction_amount: Number(amount),
          payment_method_id,
          installments: Number(installments) || 1,
          issuer_id: issuer_id || null,
          method: payment_method_id,
          payer: {
            email,
            identification: cpf ? { type: 'CPF', number: cpf } : undefined
          }
        }
      });
    }

    const mercadoPago = getMercadoPago();

    const body = {
      transaction_amount: Number(Number(amount).toFixed(2)),
      token,
      description: description || 'Compra na sua loja',
      installments: Number(installments) || 1,
      payment_method_id,
      issuer_id,
      payer: { 
        email,
        identification: cpf ? { type: 'CPF', number: cpf } : undefined
      }
    };

    // SDK v2: Payment.create({ body })
    const payment = await mercadoPago.payment.create({ body });

    const mp = payment.body || payment;

    return res.json({
      success: true,
      status: mp.status,
      status_detail: mp.status_detail,
      id: mp.id,
      payment_method_id: mp.payment_method_id,
      transaction_amount: mp.transaction_amount
    });

  } catch (e) {
    // Normalizar erros do MP
    const mpError = e?.cause?.[0];
    if (mpError) {
      return res.status(400).json({
        success: false,
        error: 'Erro no processamento do pagamento',
        code: mpError.code,
        description: mpError.description
      });
    }

    return res.status(400).json({
      success: false,
      error: e.message || 'Erro desconhecido'
    });
  }
});

router.get('/config', (req, res) => {
  // Endpoint público - SEM autenticação, SEM token, SEM nada
  // O Brick precisa apenas da publicKey para inicializar
  const publicKey = process.env.VITE_MP_PUBLIC_KEY || process.env.MP_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: "Public key não configurada" });
  }
  
  // Retorna apenas a publicKey - formato mínimo que o Brick precisa
  return res.json({ 
    publicKey: publicKey 
  });
});

// Token de cartão via MP ou mock
router.post('/mp/card-token', async (req, res) => {
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

    if (!card_number || !expiration_month || !expiration_year || !security_code || !cardholder_name || !cardholder_document_number) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN;
    if (!accessToken) {
      const token = `tok_${Date.now()}`;
      return res.json({
        token,
        status: 'active',
        first_six_digits: String(card_number).slice(0, 6),
        last_four_digits: String(card_number).slice(-4),
        expiration_month,
        expiration_year,
        cardholder_name
      });
    }

    const mp = getMercadoPago();
    const cardData = {
      card_number: String(card_number).replace(/\s/g, ''),
      expiration_month: parseInt(expiration_month),
      expiration_year: parseInt(expiration_year),
      security_code,
      cardholder_name,
      cardholder_document_type: cardholder_document_type || 'CPF',
      cardholder_document_number: String(cardholder_document_number).replace(/\D/g, '')
    };

    const tokenResponse = await mp.createCardToken(cardData);
    const tr = tokenResponse.body || tokenResponse;
    return res.json({
      token: tr.id || tr.token,
      status: tr.status || 'active',
      first_six_digits: tr.first_six_digits,
      last_four_digits: tr.last_four_digits,
      expiration_month: tr.expiration_month,
      expiration_year: tr.expiration_year,
      cardholder_name: tr.cardholder?.name || cardholder_name
    });
  } catch (error) {
    const mpError = error?.cause?.[0];
    if (mpError) {
      return res.status(400).json({ error: 'Erro nos dados do cartão', code: mpError.code, description: mpError.description });
    }
    return res.status(400).json({ error: error.message || 'Erro ao criar token' });
  }
});

// Alias de métodos no router payments
router.get('/methods', async (req, res) => {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN;
    
    if (!accessToken) {
      // Retornar métodos padrão quando não há token configurado
      return res.json({ 
        payment_methods: [
          { id: 'visa', name: 'Visa', type: 'credit_card', status: 'active' },
          { id: 'master', name: 'Mastercard', type: 'credit_card', status: 'active' },
          { id: 'amex', name: 'American Express', type: 'credit_card', status: 'active' },
          { id: 'elo', name: 'Elo', type: 'credit_card', status: 'active' },
          { id: 'pix', name: 'Pix', type: 'bank_transfer', status: 'active' }
        ], 
        public_key: process.env.VITE_MP_PUBLIC_KEY || process.env.MP_PUBLIC_KEY 
      });
    }
    
    const mp = getMercadoPago();
    const methods = await mp.getPaymentMethods();
    return res.json({ payment_methods: methods, public_key: mp.getPublicKey() });
  } catch (error) {
    console.error('Erro ao obter métodos de pagamento:', error);
    // Fallback para métodos básicos mesmo em caso de erro
    return res.json({ 
      payment_methods: [
        { id: 'visa', name: 'Visa', type: 'credit_card', status: 'active' },
        { id: 'master', name: 'Mastercard', type: 'credit_card', status: 'active' }
      ], 
      public_key: process.env.VITE_MP_PUBLIC_KEY || process.env.MP_PUBLIC_KEY 
    });
  }
});

router.post('/process_payment', async (req, res) => {
  try {
    console.log('HEADERS:', req.headers['content-type']);
    console.log('RAW BODY:', req.body);
    if (!req.body || !req.body.token) {
      return res.status(400).json({
        error: 'Payload inválido ou token ausente'
      });
    }
    const token = req.body?.token;
    const paymentMethodId = req.body?.payment_method_id || req.body?.paymentMethodId;
    const issuerId = req.body?.issuer_id || req.body?.issuerId;
    const transactionAmount = req.body?.transaction_amount ?? req.body?.transactionAmount;
    const installments = typeof req.body?.installments === 'number' ? req.body.installments : Number(req.body?.installments) || 1;
    const payer = req.body?.payer;

    if (transactionAmount == null || isNaN(Number(transactionAmount))) {
      return res.status(400).json({ error: 'transaction_amount obrigatório' });
    }
    if (!token) {
      return res.status(400).json({ error: 'token obrigatório' });
    }
    if (!paymentMethodId) {
      return res.status(400).json({ error: 'payment_method_id obrigatório' });
    }
    if (!payer?.email) {
      return res.status(400).json({ error: 'payer.email obrigatório' });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(200).json({
        success: true,
        mock: true,
        payment: {
          id: `mp_mock_${Date.now()}`,
          status: 'approved',
          transaction_amount: Number(Number(transactionAmount).toFixed(2)),
          payment_method_id: paymentMethodId,
          installments: Number(installments) || 1,
          issuer_id: issuerId || null,
          description: req.body?.description || 'Pagamento',
          payer
        }
      });
    }

    const idempotencyKey = req.body?.idempotencyKey || req.body?.idempotency_key || uuidv4();
    const mp = getMercadoPago();
    const body = {
      transaction_amount: Number(Number(transactionAmount).toFixed(2)),
      token,
      description: req.body?.description || 'Pagamento',
      installments,
      payment_method_id: paymentMethodId,
      issuer_id: issuerId,
      payer,
      external_reference: req.body?.external_reference,
      binary_mode: req.body?.binary_mode === undefined ? true : !!req.body.binary_mode,
      statement_descriptor: req.body?.statement_descriptor,
      notification_url: `${process.env.BACKEND_URL || 'https://back-end-rosia02.vercel.app'}/webhook/payment`,
      additional_info: req.body?.additional_info
    };

    const response = await mp.payment.create({ body }, { idempotencyKey });
    const mpData = response.body || response;

    let createdOrder = null;
    if (mpData && mpData.id) {
      let shippingAddress = null;
      const googleAddressId = req.body?.google_user_address_id;
      if (googleAddressId) {
        try {
          const { data: address } = await supabaseAdmin
            .from('google_user_addresses')
            .select('*')
            .eq('id', googleAddressId)
            .maybeSingle();
          if (address) {
            shippingAddress = {
              cep: address.cep,
              logradouro: address.logradouro,
              numero: address.numero,
              bairro: address.bairro,
              cidade: address.cidade,
              estado: address.estado,
              complemento: address.complemento || null
            };
          }
        } catch (_) {}
      }

      if (!shippingAddress && req.body?.shipping_address) {
        shippingAddress = req.body.shipping_address;
      }

      const subtotal = req.body?.subtotal != null ? Number(req.body.subtotal) : undefined;
      const shipping_cost = req.body?.shipping_cost != null ? Number(req.body.shipping_cost) : 0;
      const total = req.body?.transaction_amount != null
        ? Number(req.body.transaction_amount)
        : (subtotal != null ? Number((subtotal + shipping_cost).toFixed(2)) : undefined);

      const status = mpData.status === 'approved' ? 'pago' : 'pendente';
      const payment_method = (req.body?.payment_method_id === 'pix') ? 'pix' : (mpData.payment_method_id || req.body?.payment_method_id);

      const orderPayload = {
        user_id: req.body?.supabase_user_id || req.body?.user_id || req.body?.google_user_profile_id,
        subtotal,
        shipping_cost,
        total,
        status,
        payment_id: String(mpData.id),
        payment_method,
        payment_status: mpData.status,
        shipping_address: shippingAddress || req.body?.shipping_address || null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      try {
        const { data: orderInserted } = await supabaseAdmin
          .from('orders')
          .insert([orderPayload])
          .select()
          .maybeSingle();
        createdOrder = orderInserted || null;
      } catch (insertError) {
        createdOrder = null;
      }
    }

    return res.status(201).json({
      status: mpData.status,
      status_detail: mpData.status_detail,
      id: mpData.id,
      order: createdOrder
    });
  } catch (error) {
    console.error('Erro ao processar:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/mp/process', async (req, res) => {
  try {
    const idempotencyKey = req.get('X-Idempotency-Key') || req.headers['x-idempotency-key'] || req.body?.idempotencyKey || req.body?.idempotency_key || uuidv4();
    const paymentMethodId = (req.body?.payment_method_id || req.body?.paymentMethodId || '').toLowerCase();
    const accessToken = process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ error: 'Token de acesso do Mercado Pago não configurado' });
    }

    const mp = getMercadoPago();

    if (paymentMethodId === 'pix') {
      const amount = req.body?.transaction_amount ?? req.body?.amount;
      const email = req.body?.payer?.email || req.body?.email;
      if (amount == null || isNaN(Number(amount))) {
        return res.status(400).json({ error: 'transaction_amount obrigatório' });
      }
      if (!email) {
        return res.status(400).json({ error: 'payer.email obrigatório' });
      }

      const body = {
        transaction_amount: Number(Number(amount).toFixed(2)),
        description: req.body?.description || 'Pagamento via Pix',
        payment_method_id: 'pix',
        payer: { email }
      };

      const response = await mp.payment.create({ body }, { idempotencyKey });
      const data = response.body || response;
      return res.status(200).json({
        id: data.id,
        status: data.status,
        qr_code: data.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
        transaction_amount: Number(Number(amount).toFixed(2))
      });
    }

    const token = req.body?.token;
    const issuerId = req.body?.issuer_id || req.body?.issuerId;
    const transactionAmount = req.body?.transaction_amount ?? req.body?.transactionAmount;
    const installments = typeof req.body?.installments === 'number' ? req.body.installments : Number(req.body?.installments) || 1;
    const payer = req.body?.payer;

    if (transactionAmount == null || isNaN(Number(transactionAmount))) {
      return res.status(400).json({ error: 'transaction_amount obrigatório' });
    }
    if (!token) {
      return res.status(400).json({ error: 'token obrigatório' });
    }
    if (!paymentMethodId) {
      return res.status(400).json({ error: 'payment_method_id obrigatório' });
    }
    if (!payer?.email) {
      return res.status(400).json({ error: 'payer.email obrigatório' });
    }

    const body = {
      transaction_amount: Number(Number(transactionAmount).toFixed(2)),
      token,
      description: req.body?.description || 'Pagamento',
      installments,
      payment_method_id: paymentMethodId,
      issuer_id: issuerId,
      payer,
      external_reference: req.body?.external_reference,
      binary_mode: req.body?.binary_mode === undefined ? true : !!req.body.binary_mode,
      statement_descriptor: req.body?.statement_descriptor,
      notification_url: `${process.env.BACKEND_URL || 'https://back-end-rosia02.vercel.app'}/webhook/payment`,
      additional_info: req.body?.additional_info
    };

    const response = await mp.payment.create({ body }, { idempotencyKey });
    const data = response.body || response;
    return res.status(200).json(data);
  } catch (error) {
    const mpError = error?.cause?.[0] || error?.response?.data;
    return res.status(400).json({ error: mpError || { message: error.message } });
  }
});

router.post('/mp/orders/pix', async (req, res) => {
  try {
    const {
      external_reference,
      total_amount,
      amount,
      statement_descriptor,
      expiration_time,
      payer,
      shipment,
      items,
      integration_data,
      capture_mode,
      processing_mode,
      idempotency_key
    } = req.body;

    if (!external_reference || !(total_amount || amount)) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos',
        code: 'INCOMPLETE_ORDER_DATA',
        required_fields: ['external_reference', 'total_amount|amount']
      });
    }

    const mp = getMercadoPago();

    const amt = Number(total_amount ?? amount);
    const normalizedAmount = isNaN(amt) ? amt : Number(amt.toFixed(2));
    const orderBody = {
      type: 'online',
      external_reference,
      transactions: {
        payments: [
          {
            amount: String(normalizedAmount || total_amount || amount),
            payment_method: {
              id: 'pix',
              type: 'pix',
              statement_descriptor: statement_descriptor || 'Rosita Store'
            },
            expiration_time: expiration_time
          }
        ]
      },
      payer: payer,
      shipment: shipment,
      total_amount: String(normalizedAmount || total_amount || amount),
      capture_mode: capture_mode || 'automatic_async',
      processing_mode: processing_mode || 'automatic',
      description: req.body.description || (items && items[0]?.title) || 'Pedido',
      integration_data,
      items
    };

    const data = await mp.createOrder(orderBody, idempotency_key || uuidv4());
    return res.json({ success: true, order: data });
  } catch (e) {
    let payload;
    try { payload = JSON.parse(e.message); } catch { payload = { message: e.message }; }
    return res.status(400).json({ success: false, error: payload });
  }
});

// Criar preferência (Checkout Redirect)
router.post('/create-preference', async (req, res) => {
  try {
    const mp = getMercadoPago();

    const preferenceBody = req.body && req.body.items ? req.body : {
      body: undefined,
      items: [
        {
          title: 'Compra no meu site',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: 100
        }
      ]
    };

    const response = await mp.createPreference(preferenceBody);
    const preferenceId = response.id || response.body?.id;

    if (!preferenceId) {
      return res.status(500).json({ error: 'Preferência criada sem ID' });
    }

    return res.json({ preferenceId });
  } catch (err) {
    console.error('❌ Erro ao criar preferência:', err?.response?.data || err.message);
    return res.status(500).json({ error: true, details: err?.response?.data || err.message });
  }
});

// Processar pagamento de cartão (Brick → MP)
router.post('/process-card', async (req, res) => {
  try {
    const mp = getMercadoPago();

    const body = {
      ...req.body,
      binary_mode: req.body?.binary_mode === undefined ? true : !!req.body.binary_mode,
      notification_url: `${process.env.BACKEND_URL || 'https://back-end-rosia02.vercel.app'}/webhook/payment`
    };

    if (body?.transaction_amount != null && !isNaN(Number(body.transaction_amount))) {
      body.transaction_amount = Number(Number(body.transaction_amount).toFixed(2));
    }

    const response = await mp.payment.create({ body });
    const data = response.body || response;
    return res.json(data);
  } catch (err) {
    const mpError = err?.cause?.[0] || err?.response?.data;
    console.log(err);
    return res.status(400).json({ message: 'Erro ao processar pagamento', err: mpError || { message: err.message } });
  }
});

// 🔹 Criar pagamento Pix
router.post('/pix/create', async (req, res) => {
  try {
    const { amount, email, description } = req.body;

    // Validação básica
    if (!amount || !email) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos',
        code: 'INCOMPLETE_PIX_DATA',
        required_fields: ['amount', 'email']
      });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: 'Token de acesso do Mercado Pago não configurado'
      });
    }

    // 🔐 SDK Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: accessToken, // TOKEN DO VENDEDOR
    });

    const payment = new Payment(client);

    const response = await payment.create({
      body: {
        transaction_amount: Number(amount),
        description: description || "Pagamento via Pix",
        payment_method_id: "pix",
        payer: {
          email,
        },
      },
      requestOptions: {
        idempotencyKey: randomUUID(), // 🔑 OBRIGATÓRIO
      },
    });

    res.json({
      id: response.id,
      status: response.status,
      qr_code: response.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: response.point_of_interaction.transaction_data.qr_code_base64,
      ticket_url: response.point_of_interaction.transaction_data.ticket_url,
    });
  } catch (error) {
    console.error("Erro ao criar Pix:", error);
    res.status(500).json({ error: "Erro ao criar pagamento Pix" });
  }
});

module.exports = router;