const express = require('express');
const router = express.Router();
const axios = require('axios');

// Função para formatar resposta padronizada
const formatResponse = (success, data = null, message = null, error = null) => {
  const response = { success };
  
  if (success) {
    if (data) response.data = data;
    if (message) response.message = message;
  } else {
    response.error = error;
  }
  
  return response;
};

// Validação de CEP
const validateCEP = (cep) => {
  const cleanCEP = cep.replace(/[^\d]/g, '');
  return /^\d{8}$/.test(cleanCEP);
};

// GET /api/cep/:cep
router.get('/:cep', async (req, res) => {
  try {
    const { cep } = req.params;
    
    // Validar formato do CEP
    if (!validateCEP(cep)) {
      return res.status(400).json(
        formatResponse(false, null, null, {
          code: 'VALIDATION_ERROR',
          message: 'CEP inválido',
          details: {
            cep: ['Formato de CEP inválido. Use apenas números (8 dígitos)']
          }
        })
      );
    }
    
    const cleanCEP = cep.replace(/[^\d]/g, '');
    
    // Buscar CEP na API ViaCEP
    const response = await axios.get(`https://viacep.com.br/ws/${cleanCEP}/json/`, {
      timeout: 5000
    });
    
    const cepData = response.data;
    
    // Verificar se o CEP foi encontrado
    if (cepData.erro) {
      return res.status(404).json(
        formatResponse(false, null, null, {
          code: 'NOT_FOUND',
          message: 'CEP não encontrado'
        })
      );
    }
    
    // Formatar resposta conforme especificação
    const formattedData = {
      cep: cepData.cep,
      logradouro: cepData.logradouro,
      bairro: cepData.bairro,
      cidade: cepData.localidade,
      estado: cepData.uf
    };
    
    res.json(formatResponse(true, formattedData));
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json(
        formatResponse(false, null, null, {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Serviço de CEP temporariamente indisponível'
        })
      );
    }
    
    res.status(500).json(
      formatResponse(false, null, null, {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor'
      })
    );
  }
});

module.exports = router;

