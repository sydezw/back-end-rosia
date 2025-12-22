const express = require('express');
const axios = require('axios');

const router = express.Router();

router.post('/installments', async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    const paymentMethodId = req.body?.payment_method_id || 'visa';
    const bin = req.body?.bin;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'amount inválido' });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return res.json([
        { installments: 1, installment_amount: amount, total_amount: amount, recommended_message: `1x de R$ ${amount.toFixed(2)}` },
        { installments: 2, installment_amount: Number((amount / 2).toFixed(2)), total_amount: amount, recommended_message: `2x de R$ ${(amount / 2).toFixed(2)}` },
        { installments: 3, installment_amount: Number((amount / 3).toFixed(2)), total_amount: amount, recommended_message: `3x de R$ ${(amount / 3).toFixed(2)}` }
      ]);
    }

    const url = 'https://api.mercadopago.com/v1/payment_methods/installments';
    const { data } = await axios.get(url, {
      params: { amount, payment_method_id: paymentMethodId, issuer_id: req.body?.issuer_id, bin },
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000
    });

    const list = Array.isArray(data) ? data : [];
    const costs = list?.[0]?.payer_costs || [];
    return res.json(costs);
  } catch (error) {
    const payload = error?.response?.data || { message: error.message };
    return res.status(500).json({ error: 'Erro ao calcular parcelas', details: payload });
  }
});

module.exports = router;