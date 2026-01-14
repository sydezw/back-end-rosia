const melhorEnvioService = require('../services/melhorEnvioService');
const { supabaseAdmin } = require('../config/supabase');

async function pagarESincronizar(req, res) {
  try {
    const orderId = req.params?.order_id || req.params?.id || req.body?.order_id || req.body?.orderId || null;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'order_id é obrigatório' });
    }

    let { cart_item_id } = req.body || {};
    if (!cart_item_id) {
      const { data: shipments, error: shipErr } = await supabaseAdmin
        .from('melhor_envio_shipments')
        .select('id, cart_item_id')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (shipErr || !shipments || shipments.length === 0 || !shipments[0]?.cart_item_id) {
        return res.status(404).json({ success: false, message: 'Item de carrinho não encontrado para este pedido.' });
      }
      cart_item_id = shipments[0].cart_item_id;
    }

    const realMeId = await melhorEnvioService.processarPagamentoESalvarId(cart_item_id, orderId);
    let labelFromPrint = null;
    try {
      labelFromPrint = await melhorEnvioService.imprimirEtiqueta(realMeId);
    } catch (_) {}
    const retry = await melhorEnvioService.buscarRastreioComRetry(realMeId, 3, 5000);
    if ((retry && (retry.tracking || retry.label_url)) || labelFromPrint) {
      await supabaseAdmin
        .from('melhor_envio_shipments')
        .update({ tracking_code: (retry?.tracking || null), label_url: (retry?.label_url || labelFromPrint || null), status: 'pronto_para_envio' })
        .eq('order_id', orderId);
      if (retry?.tracking) {
        await supabaseAdmin
          .from('orders')
          .update({ tracking_code: retry.tracking, status: 'processando' })
          .eq('id', orderId);
      }
      return res.status(200).json({ success: true, message: 'Pagamento processado e rastreio sincronizado.', me_id: realMeId, tracking: (retry?.tracking || null), label_url: (retry?.label_url || labelFromPrint || null) });
    }
    return res.status(200).json({ success: true, message: 'Pagamento realizado. O rastreio está sendo gerado pelo Melhor Envio.', me_id: realMeId, status: 'processando_me' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Erro ao processar envio' });
  }
}

async function apenasSincronizar(req, res) {
  try {
    let me_id = req.query?.me_id || req.query?.id || null;
    const orderId = req.query?.order_id || req.query?.orderId || null;
    if (!me_id && orderId) {
      const { data: shipByOrder } = await supabaseAdmin
        .from('melhor_envio_shipments')
        .select('me_shipment_id, label_url, status')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (Array.isArray(shipByOrder) && shipByOrder.length > 0) {
        me_id = shipByOrder[0]?.me_shipment_id || null;
      }
    }
    if (!me_id || String(me_id).length < 30) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    let dados = await melhorEnvioService.sincronizarRastreio(me_id);
    let tracking = dados?.tracking || null;
    let labelUrl = dados?.label?.url || dados?.label_url || null;

    if (!labelUrl) {
      try {
        const printed = await melhorEnvioService.imprimirEtiqueta(me_id);
        if (printed) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          dados = await melhorEnvioService.sincronizarRastreio(me_id);
          tracking = dados?.tracking || tracking;
          labelUrl = dados?.label?.url || dados?.label_url || printed || null;
        }
      } catch (_) {}
    }

    if (!labelUrl) {
      if (orderId) {
        const { data: fromDbOrder } = await supabaseAdmin
          .from('melhor_envio_shipments')
          .select('label_url')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (Array.isArray(fromDbOrder) && fromDbOrder.length > 0) {
          labelUrl = fromDbOrder[0]?.label_url || null;
        }
      } else {
        const { data: fromDbMe } = await supabaseAdmin
          .from('melhor_envio_shipments')
          .select('label_url')
          .eq('me_shipment_id', me_id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (Array.isArray(fromDbMe) && fromDbMe.length > 0) {
          labelUrl = fromDbMe[0]?.label_url || null;
        }
      }
    }

    if (labelUrl) {
      await supabaseAdmin
        .from('melhor_envio_shipments')
        .update({ label_url: labelUrl, status: tracking ? 'pronto_para_envio' : 'released' })
        .eq(orderId ? 'order_id' : 'me_shipment_id', orderId || me_id);
    }

    if (tracking || labelUrl) {
      return res.status(200).json({ success: true, tracking_code: tracking || null, label_url: labelUrl || null, data: dados });
    }
    return res.status(202).json({ success: false, message: 'Etiqueta em processamento no Melhor Envio' });
  } catch (error) {
    const status = error?.response?.status || 500;
    if (status === 429) {
      return res.status(429).json({ success: false, message: 'Limite de taxa atingido. Tente novamente mais tarde.' });
    }
    if (status === 404 || status === 422) {
      return res.status(202).json({ success: false, message: 'Etiqueta em processamento no Melhor Envio' });
    }
    return res.status(500).json({ success: false, message: 'Erro na comunicação com a API' });
  }
}

module.exports = { pagarESincronizar, apenasSincronizar };