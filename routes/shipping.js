const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * POST /shipping/calculate
 * Calcula o frete baseado no CEP e itens do carrinho
 */
router.post('/calculate', async (req, res, next) => {
  try {
    const { cep, items, shipping_method = 'standard' } = req.body;

    // Validações básicas
    if (!cep) {
      return res.status(400).json({
        error: 'CEP é obrigatório',
        code: 'MISSING_CEP'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Itens do carrinho são obrigatórios',
        code: 'MISSING_ITEMS'
      });
    }

    // Validar formato do CEP
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      return res.status(400).json({
        error: 'CEP deve ter 8 dígitos',
        code: 'INVALID_CEP_FORMAT'
      });
    }

    // Verificar se CEP existe
    const isValidCep = await validateCep(cleanCep);
    if (!isValidCep) {
      return res.status(400).json({
        error: 'CEP não encontrado',
        code: 'CEP_NOT_FOUND'
      });
    }

    // Calcular peso e dimensões do carrinho
    const cartMetrics = calculateCartMetrics(items);
    
    // Calcular frete baseado na região
    const shippingOptions = await calculateShippingOptions(cleanCep, cartMetrics, shipping_method);

    res.json({
      cep: cleanCep,
      shipping_options: shippingOptions,
      cart_metrics: cartMetrics
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /shipping/methods
 * Lista métodos de envio disponíveis
 */
router.get('/methods', (req, res) => {
  const shippingMethods = [
    {
      id: 'standard',
      name: 'Entrega Padrão',
      description: 'Entrega em 5-10 dias úteis',
      base_price: 15.00
    },
    {
      id: 'express',
      name: 'Entrega Expressa',
      description: 'Entrega em 2-3 dias úteis',
      base_price: 25.00
    },
    {
      id: 'same_day',
      name: 'Entrega no Mesmo Dia',
      description: 'Entrega em até 24h (apenas capitais)',
      base_price: 35.00,
      restrictions: ['Disponível apenas em capitais', 'Pedidos até 14h']
    }
  ];

  res.json({ shipping_methods: shippingMethods });
});

/**
 * GET /shipping/zones
 * Lista zonas de entrega e preços
 */
router.get('/zones', (req, res) => {
  const shippingZones = {
    'zone_1': {
      name: 'Região Sudeste',
      states: ['SP', 'RJ', 'MG', 'ES'],
      multiplier: 1.0,
      delivery_time: '3-5 dias úteis'
    },
    'zone_2': {
      name: 'Região Sul',
      states: ['RS', 'SC', 'PR'],
      multiplier: 1.2,
      delivery_time: '4-6 dias úteis'
    },
    'zone_3': {
      name: 'Região Centro-Oeste',
      states: ['GO', 'MT', 'MS', 'DF'],
      multiplier: 1.3,
      delivery_time: '5-7 dias úteis'
    },
    'zone_4': {
      name: 'Região Nordeste',
      states: ['BA', 'SE', 'AL', 'PE', 'PB', 'RN', 'CE', 'PI', 'MA'],
      multiplier: 1.5,
      delivery_time: '6-8 dias úteis'
    },
    'zone_5': {
      name: 'Região Norte',
      states: ['AM', 'RR', 'AP', 'PA', 'TO', 'RO', 'AC'],
      multiplier: 2.0,
      delivery_time: '8-12 dias úteis'
    }
  };

  res.json({ shipping_zones: shippingZones });
});

/**
 * Função para validar CEP usando API externa
 */
async function validateCep(cep) {
  try {
    const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`, {
      timeout: 5000
    });
    
    return response.data && !response.data.erro;
  } catch (error) {
    console.error('Erro ao validar CEP:', error.message);
    return false;
  }
}

/**
 * Função para obter informações do CEP
 */
async function getCepInfo(cep) {
  try {
    const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`, {
      timeout: 5000
    });
    
    if (response.data && !response.data.erro) {
      return {
        city: response.data.localidade,
        state: response.data.uf,
        region: getRegionByState(response.data.uf)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar informações do CEP:', error.message);
    return null;
  }
}

/**
 * Função para calcular métricas do carrinho
 */
function calculateCartMetrics(items) {
  let totalWeight = 0;
  let totalVolume = 0;
  let totalValue = 0;
  let itemCount = 0;

  items.forEach(item => {
    const quantity = item.quantity || 1;
    const weight = item.weight || 0.5; // peso padrão 500g
    const price = item.price || 0;
    
    totalWeight += weight * quantity;
    totalVolume += (item.volume || 0.001) * quantity; // volume padrão 1L
    totalValue += price * quantity;
    itemCount += quantity;
  });

  return {
    total_weight: totalWeight,
    total_volume: totalVolume,
    total_value: totalValue,
    item_count: itemCount
  };
}

/**
 * Função para calcular opções de frete
 */
async function calculateShippingOptions(cep, cartMetrics, preferredMethod) {
  try {
    const cepInfo = await getCepInfo(cep);
    if (!cepInfo) {
      throw new Error('Não foi possível obter informações do CEP');
    }

    const zone = getShippingZone(cepInfo.state);
    const options = [];

    // Frete grátis para pedidos acima de R$ 100
    const freeShippingThreshold = 100;
    const isFreeShipping = cartMetrics.total_value >= freeShippingThreshold;

    // Entrega Padrão
    const standardPrice = isFreeShipping ? 0 : calculateShippingPrice(15.00, zone, cartMetrics);
    options.push({
      method: 'standard',
      name: 'Entrega Padrão',
      price: standardPrice,
      delivery_time: zone.delivery_time,
      description: isFreeShipping ? 'Frete grátis!' : `Entrega em ${zone.delivery_time}`
    });

    // Entrega Expressa
    const expressPrice = calculateShippingPrice(25.00, zone, cartMetrics);
    options.push({
      method: 'express',
      name: 'Entrega Expressa',
      price: expressPrice,
      delivery_time: getExpressDeliveryTime(zone.delivery_time),
      description: `Entrega expressa em ${getExpressDeliveryTime(zone.delivery_time)}`
    });

    // Entrega no mesmo dia (apenas para capitais)
    if (isCapital(cepInfo.city, cepInfo.state)) {
      const sameDayPrice = calculateShippingPrice(35.00, zone, cartMetrics);
      options.push({
        method: 'same_day',
        name: 'Entrega no Mesmo Dia',
        price: sameDayPrice,
        delivery_time: '24 horas',
        description: 'Entrega em até 24h (pedidos até 14h)',
        restrictions: ['Disponível apenas em capitais', 'Pedidos até 14h']
      });
    }

    return options;
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    
    // Retornar opção padrão em caso de erro
    return [{
      method: 'standard',
      name: 'Entrega Padrão',
      price: 15.00,
      delivery_time: '5-10 dias úteis',
      description: 'Entrega padrão'
    }];
  }
}

/**
 * Função para calcular preço do frete
 */
function calculateShippingPrice(basePrice, zone, cartMetrics) {
  let price = basePrice * zone.multiplier;
  
  // Adicionar custo por peso extra (acima de 2kg)
  if (cartMetrics.total_weight > 2) {
    const extraWeight = cartMetrics.total_weight - 2;
    price += extraWeight * 2; // R$ 2 por kg extra
  }
  
  // Adicionar custo por volume extra (acima de 5L)
  if (cartMetrics.total_volume > 5) {
    const extraVolume = cartMetrics.total_volume - 5;
    price += extraVolume * 1; // R$ 1 por litro extra
  }
  
  return Math.round(price * 100) / 100; // Arredondar para 2 casas decimais
}

/**
 * Função para obter zona de entrega por estado
 */
function getShippingZone(state) {
  const zones = {
    'SP': { multiplier: 1.0, delivery_time: '3-5 dias úteis' },
    'RJ': { multiplier: 1.0, delivery_time: '3-5 dias úteis' },
    'MG': { multiplier: 1.0, delivery_time: '3-5 dias úteis' },
    'ES': { multiplier: 1.0, delivery_time: '3-5 dias úteis' },
    'RS': { multiplier: 1.2, delivery_time: '4-6 dias úteis' },
    'SC': { multiplier: 1.2, delivery_time: '4-6 dias úteis' },
    'PR': { multiplier: 1.2, delivery_time: '4-6 dias úteis' },
    'GO': { multiplier: 1.3, delivery_time: '5-7 dias úteis' },
    'MT': { multiplier: 1.3, delivery_time: '5-7 dias úteis' },
    'MS': { multiplier: 1.3, delivery_time: '5-7 dias úteis' },
    'DF': { multiplier: 1.3, delivery_time: '5-7 dias úteis' }
  };
  
  // Estados do Nordeste
  const nordeste = ['BA', 'SE', 'AL', 'PE', 'PB', 'RN', 'CE', 'PI', 'MA'];
  if (nordeste.includes(state)) {
    return { multiplier: 1.5, delivery_time: '6-8 dias úteis' };
  }
  
  // Estados do Norte
  const norte = ['AM', 'RR', 'AP', 'PA', 'TO', 'RO', 'AC'];
  if (norte.includes(state)) {
    return { multiplier: 2.0, delivery_time: '8-12 dias úteis' };
  }
  
  return zones[state] || { multiplier: 1.5, delivery_time: '5-10 dias úteis' };
}

/**
 * Função para obter região por estado
 */
function getRegionByState(state) {
  const regions = {
    'SP': 'Sudeste', 'RJ': 'Sudeste', 'MG': 'Sudeste', 'ES': 'Sudeste',
    'RS': 'Sul', 'SC': 'Sul', 'PR': 'Sul',
    'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'DF': 'Centro-Oeste',
    'BA': 'Nordeste', 'SE': 'Nordeste', 'AL': 'Nordeste', 'PE': 'Nordeste',
    'PB': 'Nordeste', 'RN': 'Nordeste', 'CE': 'Nordeste', 'PI': 'Nordeste', 'MA': 'Nordeste',
    'AM': 'Norte', 'RR': 'Norte', 'AP': 'Norte', 'PA': 'Norte', 'TO': 'Norte', 'RO': 'Norte', 'AC': 'Norte'
  };
  
  return regions[state] || 'Desconhecida';
}

/**
 * Função para calcular tempo de entrega expressa
 */
function getExpressDeliveryTime(standardTime) {
  const timeMap = {
    '3-5 dias úteis': '1-2 dias úteis',
    '4-6 dias úteis': '2-3 dias úteis',
    '5-7 dias úteis': '3-4 dias úteis',
    '6-8 dias úteis': '4-5 dias úteis',
    '8-12 dias úteis': '5-7 dias úteis'
  };
  
  return timeMap[standardTime] || '2-3 dias úteis';
}

/**
 * Função para verificar se é capital
 */
function isCapital(city, state) {
  const capitals = {
    'SP': 'São Paulo',
    'RJ': 'Rio de Janeiro',
    'MG': 'Belo Horizonte',
    'ES': 'Vitória',
    'RS': 'Porto Alegre',
    'SC': 'Florianópolis',
    'PR': 'Curitiba',
    'GO': 'Goiânia',
    'MT': 'Cuiabá',
    'MS': 'Campo Grande',
    'DF': 'Brasília',
    'BA': 'Salvador',
    'SE': 'Aracaju',
    'AL': 'Maceió',
    'PE': 'Recife',
    'PB': 'João Pessoa',
    'RN': 'Natal',
    'CE': 'Fortaleza',
    'PI': 'Teresina',
    'MA': 'São Luís',
    'AM': 'Manaus',
    'RR': 'Boa Vista',
    'AP': 'Macapá',
    'PA': 'Belém',
    'TO': 'Palmas',
    'RO': 'Porto Velho',
    'AC': 'Rio Branco'
  };
  
  return capitals[state] === city;
}

module.exports = router;