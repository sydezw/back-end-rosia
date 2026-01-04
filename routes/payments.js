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

function mapStatusDetailMessage(code) {
  const map = {
    cc_rejected_bad_filled_card_number: 'Número do cartão inválido',
    cc_rejected_bad_filled_date: 'Data de validade inválida',
    cc_rejected_bad_filled_other: 'Dados do cartão inválidos',
    cc_rejected_other_reason: 'Pagamento rejeitado pelo emissor',
    cc_rejected_insufficient_amount: 'Saldo insuficiente',
    cc_rejected_call_for_authorize: 'Transação não autorizada pelo banco',
    cc_rejected_high_risk: 'Pagamento rejeitado por prevenção de risco',
    cc_rejected_blacklist: 'Pagamento rejeitado',
    card_token_expired: 'Token do cartão expirado',
    bad_request: 'Requisição inválida'
  };
  return map[code] || 'Pagamento rejeitado';
}
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

    const normalizedMethod = typeof payment_method_id === 'string' ? payment_method_id.toLowerCase() : payment_method_id;
    const body = {
      transaction_amount: Number(Number(amount).toFixed(2)),
      token,
      description: description || 'Compra na sua loja',
      installments: Number(installments) || 1,
      payment_method_id: normalizedMethod,
      payer: {
        email,
        identification: cpf ? { type: 'CPF', number: cpf } : undefined
      }
    };
    if (issuer_id !== undefined && issuer_id !== null && String(issuer_id).trim() !== '') {
      body.issuer_id = issuer_id;
    }

    let mp;
    try {
      const payment = await mercadoPago.payment.create({ body });
      mp = payment.body || payment;
    } catch (errFirst) {
      if (body.issuer_id) {
        const retryBody = { ...body };
        delete retryBody.issuer_id;
        try {
          const retry = await mercadoPago.payment.create({ body: retryBody });
          mp = retry.body || retry;
        } catch (errRetry) {
          const mpError2 = errRetry?.cause?.[0];
          if (mpError2) {
            return res.status(400).json({
              success: false,
              error: 'Erro no processamento do pagamento',
              code: mpError2.code,
              description: mpError2.description
            });
          }
          return res.status(400).json({ success: false, error: errRetry.message || 'Erro desconhecido' });
        }
      } else {
        const mpError1 = errFirst?.cause?.[0];
        if (mpError1) {
          return res.status(400).json({
            success: false,
            error: 'Erro no processamento do pagamento',
            code: mpError1.code,
            description: mpError1.description
          });
        }
        return res.status(400).json({ success: false, error: errFirst.message || 'Erro desconhecido' });
      }
    }
    return res.json({
      success: true,
      status: mp.status,
      status_detail: mp.status_detail,
      id: mp.id,
      payment_method_id: mp.payment_method_id,
      transaction_amount: mp.transaction_amount
    });

  } catch (e) {
    const mpError = e?.cause?.[0];
    if (mpError) {
      return res.status(400).json({ success: false, error: 'Erro no processamento do pagamento', code: mpError.code, description: mpError.description });
    }
    return res.status(400).json({ success: false, error: e.message || 'Erro desconhecido' });
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
    const token = req.body?.token;
    const payment_method_id = req.body?.payment_method_id || req.body?.paymentMethodId;
    const issuer_id = req.body?.issuer_id || req.body?.issuerId;
    const transaction_amount = req.body?.transaction_amount ?? req.body?.transactionAmount;
    const installments = typeof req.body?.installments === 'number' ? req.body.installments : Number(req.body?.installments) || 1;
    const payer = req.body?.payer;
    const external_reference = req.body?.external_reference;
    const description = req.body?.description || 'Pagamento';
    const binary_mode = req.body?.binary_mode === undefined ? true : !!req.body.binary_mode;

    if (transaction_amount == null || isNaN(Number(transaction_amount))) {
      return res.status(400).json({ error: 'transaction_amount obrigatório' });
    }
    if (!token) {
      return res.status(400).json({ error: 'token obrigatório' });
    }
    if (!payment_method_id) {
      return res.status(400).json({ error: 'payment_method_id obrigatório' });
    }
    if (!payer?.email) {
      return res.status(400).json({ error: 'payer.email obrigatório' });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN;
    if (!accessToken) {
      const mockId = `mp_mock_${Date.now()}`;
      return res.status(200).json({
        id: mockId,
        status: 'approved',
        status_detail: 'accredited',
        external_reference: external_reference || null,
        transaction_amount: Number(Number(transaction_amount).toFixed(2)),
        payment_method_id,
        installments: Number(installments) || 1,
        issuer_id: issuer_id || null,
        description,
        payer,
        payment: { id: mockId, status: 'approved' }
      });
    }

    const mp = getMercadoPago();
    const idempotencyKey = req.get('X-Idempotency-Key') || req.headers['x-idempotency-key'] || req.body?.idempotencyKey || req.body?.idempotency_key || uuidv4();

    const body = {
      transaction_amount: Number(Number(transaction_amount).toFixed(2)),
      token,
      description,
      installments,
      payment_method_id,
      payer,
      external_reference,
      binary_mode,
      notification_url: `${process.env.BACKEND_URL || 'https://back-end-rosia02.vercel.app'}/webhook/payment`,
      additional_info: req.body?.additional_info
    };
    if (issuer_id !== undefined && issuer_id !== null && String(issuer_id).trim() !== '') {
      body.issuer_id = issuer_id;
    }

    try {
      const response = await mp.payment.create({ body }, { idempotencyKey });
      const data = response.body || response;

      const externalRef = req.body?.external_reference || null;
      const bodyOrderId = req.body?.order_id || req.body?.orderId || null;
      const supabaseUserId = req.body?.supabase_user_id || req.body?.user_id || null;
      let targetOrderId = bodyOrderId || null;
      try {
        if (!targetOrderId && externalRef) {
          const { data: byRef } = await supabaseAdmin
            .from('orders')
            .select('id')
            .eq('external_reference', externalRef)
            .maybeSingle();
          if (byRef?.id) targetOrderId = byRef.id;
        }
      } catch {}
      if (!targetOrderId) targetOrderId = bodyOrderId || uuidv4();

      const rawItems = Array.isArray(req.body?.items)
        ? req.body.items
        : (Array.isArray(req.body?.additional_info?.items) ? req.body.additional_info.items : []);
      const items = Array.isArray(rawItems) ? rawItems : [];
      const shippingAddress = req.body?.shipping_address ?? {};
      const subtotal = req.body?.subtotal != null ? Number(req.body.subtotal) : items.reduce((sum, it) => sum + Number(it.unit_price ?? it.product_price ?? it.price ?? 0) * Number(it.quantity ?? 1), 0);
      const shipping_cost = req.body?.shipping_cost != null ? Number(req.body.shipping_cost) : 0;
      const total = Number(Number((subtotal + shipping_cost)).toFixed(2));

      try {
        const payload = {
          id: targetOrderId,
          user_id: supabaseUserId,
          external_reference: externalRef || targetOrderId,
          items,
          subtotal,
          shipping_cost,
          total,
          status: data.status === 'approved' ? 'pago' : 'pendente',
          payment_method: 'credit_card',
          payment_status: data.status,
          payment_id: data?.id ? String(data.id) : null,
          shipping_address: shippingAddress,
          updated_at: new Date().toISOString(),
          payment_confirmed_at: data.status === 'approved' ? new Date().toISOString() : null
        };
        await supabaseAdmin.from('orders').upsert([payload], { onConflict: 'id' });
      } catch {}

      return res.status(200).json(data);
    } catch (e1) {
      // Retry sem issuer_id quando presente
      if (body.issuer_id) {
        const retryBody = { ...body };
        delete retryBody.issuer_id;
        try {
          const retryResp = await mp.payment.create({ body: retryBody }, { idempotencyKey });
          const retryData = retryResp.body || retryResp;
          try {
            const externalRef = req.body?.external_reference || null;
            const bodyOrderId = req.body?.order_id || req.body?.orderId || null;
            const supabaseUserId = req.body?.supabase_user_id || req.body?.user_id || null;
            const targetOrderId = bodyOrderId || uuidv4();
            const rawItems = Array.isArray(req.body?.items)
              ? req.body.items
              : (Array.isArray(req.body?.additional_info?.items) ? req.body.additional_info.items : []);
            const items = Array.isArray(rawItems) ? rawItems : [];
            const shippingAddress = req.body?.shipping_address ?? {};
            const subtotal = req.body?.subtotal != null ? Number(req.body.subtotal) : items.reduce((sum, it) => sum + Number(it.unit_price ?? it.product_price ?? it.price ?? 0) * Number(it.quantity ?? 1), 0);
            const shipping_cost = req.body?.shipping_cost != null ? Number(req.body.shipping_cost) : 0;
            const total = Number(Number((subtotal + shipping_cost)).toFixed(2));
            const payload = {
              id: targetOrderId,
              user_id: supabaseUserId,
              external_reference: externalRef || targetOrderId,
              items,
              subtotal,
              shipping_cost,
              total,
              status: retryData.status === 'approved' ? 'pago' : 'pendente',
              payment_method: 'credit_card',
              payment_status: retryData.status,
              payment_id: retryData?.id ? String(retryData.id) : null,
              shipping_address: shippingAddress,
              updated_at: new Date().toISOString(),
              payment_confirmed_at: retryData.status === 'approved' ? new Date().toISOString() : null
            };
            await supabaseAdmin.from('orders').upsert([payload], { onConflict: 'id' });
          } catch {}
          return res.status(200).json(retryData);
        } catch (e2) {
          const mpError2 = e2?.cause?.[0] || e2?.response?.data;
          return res.status(400).json({ error: mpError2 || { message: e2.message } });
        }
      } else {
        const mpError1 = e1?.cause?.[0] || e1?.response?.data;
        return res.status(400).json({ error: mpError1 || { message: e1.message } });
      }
    }
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

router.post('/mp/process', async (req, res) => {
  try {
    const idempotencyKey = req.get('X-Idempotency-Key') || req.headers['x-idempotency-key'] || req.body?.idempotencyKey || req.body?.idempotency_key || uuidv4();
    const paymentType = (req.body?.payment_type || req.body?.payment_method_id || req.body?.paymentMethodId || '').toLowerCase();
    const accessToken = process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ error: 'Token de acesso do Mercado Pago não configurado' });
    }

    const mp = getMercadoPago();

    if (paymentType === 'pix') {
      const amount = req.body?.transaction_amount ?? req.body?.amount;
      const email = req.body?.payer?.email || req.body?.email;
      if (amount == null || isNaN(Number(amount))) return res.status(400).json({ error: 'transaction_amount obrigatório' });
      if (!email) return res.status(400).json({ error: 'payer.email obrigatório' });

      const body = {
        transaction_amount: Number(Number(amount).toFixed(2)),
        description: req.body?.description || 'Pagamento via Pix',
        payment_method_id: 'pix',
        payer: { email },
        external_reference: req.body?.external_reference || null,
        notification_url: `${process.env.BACKEND_URL || 'https://back-end-rosia02.vercel.app'}/webhook/payment`
      };

      const response = await mp.payment.create({ body }, { idempotencyKey });
      const data = response.body || response;

      const externalRef = req.body?.external_reference || null;
      const bodyOrderId = req.body?.order_id || req.body?.orderId || null;
      const supabaseUserId = req.body?.supabase_user_id || req.body?.user_id || null;
      let targetOrderId = bodyOrderId || null;
      try {
        if (!targetOrderId && externalRef) {
          const { data: byRef } = await supabaseAdmin
            .from('orders')
            .select('id')
            .eq('external_reference', externalRef)
            .maybeSingle();
          if (byRef?.id) targetOrderId = byRef.id;
        }
      } catch {}
      if (!targetOrderId) targetOrderId = bodyOrderId || uuidv4();

      const rawItems = Array.isArray(req.body?.items)
        ? req.body.items
        : (Array.isArray(req.body?.additional_info?.items) ? req.body.additional_info.items : []);
      const items = Array.isArray(rawItems) ? rawItems : [];
      const shippingAddress = req.body?.shipping_address ?? {};
      const subtotal = req.body?.subtotal != null ? Number(req.body.subtotal) : items.reduce((sum, it) => sum + Number(it.unit_price ?? it.product_price ?? it.price ?? 0) * Number(it.quantity ?? 1), 0);
      const shipping_cost = req.body?.shipping_cost != null ? Number(req.body.shipping_cost) : 0;
      const total = Number(Number((subtotal + shipping_cost)).toFixed(2));

      try {
        const { data: existing } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('id', targetOrderId)
          .maybeSingle();
        const payload = {
          id: targetOrderId,
          user_id: supabaseUserId,
          external_reference: externalRef || targetOrderId,
          items,
          subtotal,
          shipping_cost,
          total,
          status: 'pendente',
          payment_method: 'pix',
          payment_status: 'pending',
          payment_id: data?.id ? String(data.id) : null,
          shipping_address: shippingAddress,
          updated_at: new Date().toISOString()
        };
        if (existing?.id) {
          await supabaseAdmin.from('orders').update(payload).eq('id', targetOrderId);
        } else {
          await supabaseAdmin.from('orders').insert([{ ...payload, created_at: new Date().toISOString() }]);
        }
        if (items.length > 0) {
          const { data: existingItems } = await supabaseAdmin
            .from('order_items')
            .select('id')
            .eq('order_id', targetOrderId);
          if (!existingItems || existingItems.length === 0) {
            const itemsToInsert = items.map(it => ({
              order_id: targetOrderId,
              product_id: it.product_id || it.productId,
              quantity: Number(it.quantity || 1),
              unit_price: Number(it.unit_price ?? it.product_price ?? it.price ?? 0),
              selected_size: it.selected_size ?? it.size ?? null,
              selected_color: it.selected_color ?? it.color ?? null,
              product_name: it.product_name || it.name || null
            }));
            await supabaseAdmin.from('order_items').insert(itemsToInsert);
          }
        }
      } catch {}

      const qr = data.point_of_interaction?.transaction_data;
      return res.status(200).json({
        success: true,
        status: 'pending',
        order: {
          id: targetOrderId,
          status: 'pending',
          qr_code_base64: qr?.qr_code_base64 || null,
          qr_code: qr?.qr_code || null,
          expiration_time: qr?.expiration_time || data?.date_of_expiration || null
        }
      });
    }

    if (paymentType === 'ticket') {
      const amount = req.body?.transaction_amount ?? req.body?.amount;
      const email = req.body?.payer?.email || req.body?.email;
      if (amount == null || isNaN(Number(amount))) return res.status(400).json({ error: 'transaction_amount obrigatório' });
      if (!email) return res.status(400).json({ error: 'payer.email obrigatório' });

      const body = {
        transaction_amount: Number(Number(amount).toFixed(2)),
        description: req.body?.description || 'Pagamento via Boleto',
        payment_method_id: req.body?.payment_method_id || 'bolbradesco',
        payer: { email },
        external_reference: req.body?.external_reference || null
      };
      const response = await mp.payment.create({ body }, { idempotencyKey });
      const data = response.body || response;

      const externalRef = req.body?.external_reference || null;
      const bodyOrderId = req.body?.order_id || req.body?.orderId || null;
      const supabaseUserId = req.body?.supabase_user_id || req.body?.user_id || null;
      const targetOrderId = bodyOrderId || uuidv4();
      const rawItems = Array.isArray(req.body?.items)
        ? req.body.items
        : (Array.isArray(req.body?.additional_info?.items) ? req.body.additional_info.items : []);
      const items = Array.isArray(rawItems) ? rawItems : [];
      const shippingAddress = req.body?.shipping_address ?? {};
      const subtotal = req.body?.subtotal != null ? Number(req.body.subtotal) : items.reduce((sum, it) => sum + Number(it.unit_price ?? it.product_price ?? it.price ?? 0) * Number(it.quantity ?? 1), 0);
      const shipping_cost = req.body?.shipping_cost != null ? Number(req.body.shipping_cost) : 0;
      const total = Number(Number((subtotal + shipping_cost)).toFixed(2));
      try {
        const payload = {
          id: targetOrderId,
          user_id: supabaseUserId,
          external_reference: externalRef || targetOrderId,
          items,
          subtotal,
          shipping_cost,
          total,
          status: 'pendente',
          payment_method: 'boleto',
          payment_status: 'pending',
          payment_id: data?.id ? String(data.id) : null,
          shipping_address: shippingAddress,
          updated_at: new Date().toISOString()
        };
        await supabaseAdmin.from('orders').upsert([payload], { onConflict: 'id' });
      } catch {}

      const ticketUrl = data?.point_of_interaction?.transaction_data?.ticket_url || data?.transaction_details?.external_resource_url || null;
      return res.status(200).json({
        success: true,
        status: 'pending',
        order: {
          id: targetOrderId,
          status: 'pending',
          ticket_url: ticketUrl,
          expiration_time: data?.date_of_expiration || null
        }
      });
    }

    return res.status(400).json({ error: 'payment_type inválido. Use pix ou ticket.' });
  } catch (error) {
    const mpError = error?.cause?.[0] || error?.response?.data;
    const message = (typeof mpError === 'string' ? mpError : mpError?.message) || error.message;
    const statusCode = (message === 'internal_error' || (error?.response?.status && error.response.status >= 500)) ? 500 : 400;
    return res.status(statusCode).json({ error: message || 'processing_error', detail: mpError });
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
    const supabase_user_id = req.body?.supabase_user_id || req.body?.user_id || null;
    const order_id = req.body?.order_id || req.body?.orderId || null;
    const external_reference = req.body?.external_reference || null;
    const transaction_amount = req.body?.transaction_amount != null ? Number(req.body.transaction_amount) : null;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const shipping_address = req.body?.shipping_address || null;
    const payment_type = req.body?.payment_type || 'credit_card';
    let status = req.body?.status || 'processing';

    if (!supabase_user_id) return res.status(400).json({ error: 'supabase_user_id obrigatório' });
    if (!external_reference && !order_id) return res.status(400).json({ error: 'external_reference ou order_id obrigatório' });
    if (transaction_amount == null || isNaN(Number(transaction_amount))) return res.status(400).json({ error: 'transaction_amount obrigatório' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items obrigatório' });
    if (!shipping_address || typeof shipping_address !== 'object') return res.status(400).json({ error: 'shipping_address obrigatório' });

    const statusInput = String(status || '').toLowerCase();
    let mappedOrderStatus = 'pendente';
    let payment_status = 'pending';
    if (statusInput === 'approved') {
      mappedOrderStatus = 'confirmed';
      payment_status = 'approved';
    } else if (statusInput === 'rejected' || statusInput === 'cancelled') {
      mappedOrderStatus = 'pagamento_rejeitado';
      payment_status = 'rejected';
    } else {
      mappedOrderStatus = 'pendente';
      payment_status = statusInput === 'processing' ? 'in_process' : 'pending';
    }

    const subtotal = req.body?.subtotal != null
      ? Number(req.body.subtotal)
      : items.reduce((sum, it) => sum + Number(it.unit_price ?? it.product_price ?? it.price ?? 0) * Number(it.quantity ?? 1), 0);
    const shipping_cost = req.body?.shipping_cost != null ? Number(req.body.shipping_cost) : 0;
    const total = Number(Number((subtotal + shipping_cost)).toFixed(2));

    let targetOrderId = null;
    if (external_reference) {
      try {
        const { data: found } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('external_reference', external_reference)
          .maybeSingle();
        if (found?.id) targetOrderId = found.id;
      } catch {}
    }
    if (!targetOrderId && order_id) {
      try {
        const { data: byId } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('id', order_id)
          .maybeSingle();
        if (byId?.id) targetOrderId = byId.id;
      } catch {}
    }
    if (!targetOrderId) targetOrderId = order_id || uuidv4();

    const orderPayload = {
      id: targetOrderId,
      user_id: supabase_user_id,
      external_reference: external_reference || targetOrderId,
      items,
      subtotal,
      shipping_cost,
      total,
      status: mappedOrderStatus,
      payment_method: payment_type === 'credit_card' ? 'cartao_credito' : payment_type,
      payment_status,
      shipping_address,
      updated_at: new Date().toISOString()
    };

    try {
      const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('id', targetOrderId)
        .maybeSingle();
      if (existing?.id) {
        await supabaseAdmin
          .from('orders')
          .update(orderPayload)
          .eq('id', targetOrderId);
      } else {
        await supabaseAdmin
          .from('orders')
          .insert([{ ...orderPayload, created_at: new Date().toISOString() }]);
      }
    } catch (dbErr) {
      return res.status(500).json({ error: 'Falha ao persistir pedido', detail: dbErr.message });
    }

    if (Array.isArray(items) && items.length > 0) {
      try {
        const { data: existingItems } = await supabaseAdmin
          .from('order_items')
          .select('id')
          .eq('order_id', targetOrderId);
        if (!existingItems || existingItems.length === 0) {
          const itemsToInsert = items.map(it => ({
            order_id: targetOrderId,
            product_id: it.product_id || it.productId,
            quantity: Number(it.quantity || 1),
            unit_price: Number(it.unit_price ?? it.product_price ?? it.price ?? 0),
            selected_size: it.selected_size ?? it.size ?? null,
            selected_color: it.selected_color ?? it.color ?? null,
            product_name: it.product_name || it.name || null
          }));
          await supabaseAdmin
            .from('order_items')
            .insert(itemsToInsert);
        }
      } catch {}
    }

    let freshOrder = null;
    try {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', targetOrderId)
        .maybeSingle();
      freshOrder = order || null;
    } catch {}

    return res.json({
      success: true,
      status: statusInput === 'approved' ? 'approved' : (statusInput === 'rejected' ? 'rejected' : (statusInput === 'processing' ? 'processing' : 'pending')),
      reason_message: req.body?.status_detail ? mapStatusDetailMessage(req.body.status_detail) : undefined,
      order: freshOrder ? {
        id: freshOrder.id,
        status: mappedOrderStatus === 'confirmed' ? 'confirmed' : (mappedOrderStatus === 'pagamento_rejeitado' ? 'rejected' : 'pending'),
        payment_method: payment_type,
        total: freshOrder.total
      } : {
        id: targetOrderId,
        status: mappedOrderStatus === 'confirmed' ? 'confirmed' : (mappedOrderStatus === 'pagamento_rejeitado' ? 'rejected' : 'pending'),
        payment_method: payment_type,
        total: total
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro interno' });
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
        external_reference: req.body?.external_reference || null,
        notification_url: `${process.env.BACKEND_URL || 'https://back-end-rosia02.vercel.app'}/webhook/payment`
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