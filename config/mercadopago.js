const { MercadoPagoConfig, Payment, CardToken, Preference } = require('mercadopago');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Configuração do Mercado Pago
 * Inicializa o cliente com as credenciais do ambiente
 */
class MercadoPagoService {
  constructor() {
    this.accessToken = process.env.MP_ACCESS_TOKEN;
    this.clientId = process.env.MP_CLIENT_ID;
    this.clientSecret = process.env.MP_CLIENT_SECRET;
    this.publicKey = process.env.MP_PUBLIC_KEY;

    if (!this.accessToken) {
      throw new Error('MP_ACCESS_TOKEN não configurado nas variáveis de ambiente');
    }

    // Configurar cliente do Mercado Pago
    this.client = new MercadoPagoConfig({
      accessToken: this.accessToken,
      options: {
        timeout: 5000
      }
    });

    // Inicializar serviços
    this.payment = new Payment(this.client);
    this.cardToken = new CardToken(this.client);
    this.preference = new Preference(this.client);
  }

  /**
   * Criar token de cartão
   * @param {Object} cardData - Dados do cartão
   * @returns {Promise<Object>} Token do cartão
   */
  async createCardToken(cardData) {
    try {
      const tokenData = {
        card_number: cardData.card_number,
        expiration_month: cardData.expiration_month,
        expiration_year: cardData.expiration_year,
        security_code: cardData.security_code,
        cardholder: {
          name: cardData.cardholder_name,
          identification: {
            type: cardData.cardholder_document_type || 'CPF',
            number: cardData.cardholder_document_number
          }
        }
      };

      const response = await this.cardToken.create({ body: tokenData });
      return response;
    } catch (error) {
      console.error('Erro ao criar token do cartão:', error);
      throw error;
    }
  }

  /**
   * Criar pagamento
   * @param {Object} paymentData - Dados do pagamento
   * @returns {Promise<Object>} Resposta do pagamento
   */
  async createPayment(paymentData, idempotencyKey) {
    try {
      const payment = {
        transaction_amount: paymentData.transaction_amount,
        token: paymentData.token,
        description: paymentData.description,
        installments: paymentData.installments || 1,
        payment_method_id: paymentData.payment_method_id,
        issuer_id: paymentData.issuer_id,
        payer: {
          email: paymentData.payer.email,
          identification: {
            type: paymentData.payer.identification.type,
            number: paymentData.payer.identification.number
          },
          first_name: paymentData.payer.first_name,
          last_name: paymentData.payer.last_name
        },
        external_reference: paymentData.external_reference,
        notification_url: `${process.env.BACKEND_URL || 'https://back-end-rosia02.vercel.app'}/webhook/payment`,
        metadata: {
          order_id: paymentData.order_id
        }
      };

      // Adicionar endereço de cobrança se fornecido
      if (paymentData.billing_address) {
        payment.additional_info = {
          payer: {
            address: {
              zip_code: paymentData.billing_address.zip_code,
              street_name: paymentData.billing_address.street_name,
              street_number: paymentData.billing_address.street_number
            }
          }
        };
      }

      const response = await this.payment.create({ body: payment }, { idempotencyKey });
      return response;
    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      throw error;
    }
  }

  async createOrder(orderData, idempotencyKey) {
    try {
      const url = 'https://api.mercadopago.com/v1/orders';
      const headers = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey || uuidv4()
      };
      const { data } = await axios.post(url, orderData, { headers, timeout: 15000 });
      return data;
    } catch (error) {
      const payload = error?.response?.data || { message: error.message };
      throw new Error(JSON.stringify(payload));
    }
  }

  /**
   * Consultar pagamento
   * @param {string} paymentId - ID do pagamento
   * @returns {Promise<Object>} Dados do pagamento
   */
  async getPayment(paymentId) {
    try {
      const response = await this.payment.get({ id: paymentId });
      return response;
    } catch (error) {
      console.error('Erro ao consultar pagamento:', error);
      throw error;
    }
  }

  /**
   * Cancelar pagamento
   * @param {string} paymentId - ID do pagamento
   * @returns {Promise<Object>} Resposta do cancelamento
   */
  async cancelPayment(paymentId) {
    try {
      const response = await this.payment.cancel({ id: paymentId });
      return response;
    } catch (error) {
      console.error('Erro ao cancelar pagamento:', error);
      throw error;
    }
  }

  /**
   * Obter métodos de pagamento disponíveis
   * @returns {Promise<Array>} Lista de métodos de pagamento
   */
  async getPaymentMethods() {
    try {
      const url = 'https://api.mercadopago.com/v1/payment_methods';
      const { data } = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        timeout: 8000
      });

      // Normalizar resposta para formato simples usado pelo frontend
      return (Array.isArray(data) ? data : []).map((pm) => ({
        id: pm.id,
        name: pm.name,
        type: pm.payment_type_id, // ex: credit_card, ticket, account_money
        status: pm.status,
        accreditation_time: pm.accreditation_time
      }));
    } catch (error) {
      console.error('Erro ao obter métodos de pagamento do Mercado Pago:', error?.response?.data || error.message);
      // Fallback mínimo para evitar quebrar o frontend em caso de erro
      return [
        { id: 'visa', name: 'Visa', type: 'credit_card', status: 'active' },
        { id: 'master', name: 'Mastercard', type: 'credit_card', status: 'active' }
      ];
    }
  }

  /**
   * Validar configuração
   * @returns {boolean} True se configurado corretamente
   */
  isConfigured() {
    return !!(this.accessToken && this.clientId && this.publicKey);
  }

  /**
   * Obter chave pública (para uso no frontend)
   * @returns {string} Chave pública
   */
  getPublicKey() {
    return this.publicKey;
  }
  
  async createPreference(preferenceBody) {
    try {
      const response = await this.preference.create({ body: preferenceBody });
      return response;
    } catch (error) {
      console.error('Erro ao criar preferência:', error);
      throw error;
    }
  }
}

// Instância singleton
let mercadoPagoInstance = null;

/**
 * Obter instância do Mercado Pago
 * @returns {MercadoPagoService} Instância configurada
 */
function getMercadoPago() {
  if (!mercadoPagoInstance) {
    mercadoPagoInstance = new MercadoPagoService();
  }
  return mercadoPagoInstance;
}

module.exports = {
  MercadoPagoService,
  getMercadoPago
};

