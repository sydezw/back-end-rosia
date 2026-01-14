const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');

function getBaseUrl() {
  const raw = (process.env.MELHOR_ENVIO_API_URL || 'https://sandbox.melhorenvio.com.br/api/v2').trim().replace(/\/$/, '');
  return raw.includes('/api/v2') ? raw.replace(/\/api\/v2.*$/, '/api/v2') : `${raw}/api/v2`;
}

function getHeaders() {
  const rawToken = process.env.MELHOR_ENVIO_TOKEN || process.env.MELHOR_ENVIO_SECRET || '';
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!token) {
    throw new Error('Token do Melhor Envio não configurado');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'Rosia Backend (contato@rosia.com.br)'
  };
}

async function processarPagamentoESalvarId(cartItemId, orderId) {
  if (!cartItemId || !orderId) {
    throw new Error('Parâmetros inválidos');
  }
  const headers = getHeaders();
  const baseUrl = getBaseUrl();
  const resp = await axios.post(`${baseUrl}/me/shipment/checkout`, { orders: [cartItemId] }, { headers });
  const realMeId = resp?.data?.purchase?.orders?.[0]?.id || resp?.data?.orders?.[0]?.id || null;
  if (!realMeId) {
    throw new Error('Falha ao obter o ID oficial da etiqueta após o checkout.');
  }
  await supabaseAdmin
    .from('melhor_envio_shipments')
    .update({ me_shipment_id: realMeId, status: 'released', payment_status: 'paid' })
    .eq('order_id', orderId);
  return realMeId;
}

async function sincronizarRastreio(meShipmentId) {
  if (!meShipmentId || String(meShipmentId).length < 30) {
    throw new Error('ID de envio inválido para sincronização.');
  }
  const headers = getHeaders();
  const baseUrl = getBaseUrl();
  const resp = await axios.get(`${baseUrl}/me/orders/${meShipmentId}`, { headers });
  return resp.data;
}

async function buscarRastreioComRetry(meShipmentId, tentativas = 3, delayMs = 5000) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const data = await sincronizarRastreio(meShipmentId);
      const tracking = data?.tracking || null;
      const labelUrl = data?.label?.url || data?.label_url || null;
      if (tracking || labelUrl) {
        return { tracking, label_url: labelUrl, data };
      }
    } catch (_) {}
    if (i < tentativas - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

async function imprimirEtiqueta(meShipmentId) {
  if (!meShipmentId || String(meShipmentId).length < 30) {
    throw new Error('ID de envio inválido para impressão.');
  }
  const headers = getHeaders();
  const baseUrl = getBaseUrl();
  const resp = await axios.post(`${baseUrl}/me/shipment/print`, { orders: [meShipmentId] }, { headers });
  let url = null;
  const keyed = resp?.data && typeof resp.data === 'object' ? (resp.data[meShipmentId] || null) : null;
  if (keyed && typeof keyed === 'object') {
    url = keyed?.label_url || keyed?.label?.url || keyed?.url || null;
  } else {
    url = resp?.data?.url || resp?.data?.label?.url || null;
    const ordersArr = resp?.data?.orders || (Array.isArray(resp?.data) ? resp.data : []);
    if (!url && Array.isArray(ordersArr) && ordersArr.length > 0) {
      const first = ordersArr[0];
      url = first?.label_url || first?.label?.url || null;
    }
  }
  return url || null;
}

module.exports = {
  processarPagamentoESalvarId,
  sincronizarRastreio,
  buscarRastreioComRetry,
  imprimirEtiqueta
};
