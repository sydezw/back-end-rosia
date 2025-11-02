const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

// Validação de CPF
const validateCPF = (cpf) => {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;
  
  return digit1 === parseInt(cleanCPF[9]) && digit2 === parseInt(cleanCPF[10]);
};

// Validação de CEP
const validateCEP = (cep) => {
  const cleanCEP = cep.replace(/[^\d]/g, '');
  return /^\d{8}$/.test(cleanCEP);
};

// Validação de telefone
const validatePhone = (phone) => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  return /^\d{10,11}$/.test(cleanPhone);
};

/**
 * PUT /api/profile-config/complete
 * Configurar dados completos do perfil (user_profiles + user_addresses)
 */
router.put('/complete', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      // Dados para user_profiles
      cpf,
      telefone,
      phone,
      data_nascimento,
      birth_date,
      full_name,
      nome,
      gender,
      
      // Dados para user_addresses
      cep,
      logradouro,
      numero,
      bairro,
      cidade,
      estado,
      complemento
    } = req.body;

    console.log('🔧 Configurando perfil completo para usuário:', userId);
    console.log('📝 Dados recebidos:', req.body);

    // Normalizar dados do perfil
    const profileData = {
      full_name: full_name || nome,
      cpf: cpf,
      phone: phone || telefone,
      birth_date: birth_date || data_nascimento,
      gender: gender
    };

    // Validações do perfil
    const errors = {};

    if (profileData.full_name && profileData.full_name.trim().length < 2) {
      errors.nome = ['Nome deve ter pelo menos 2 caracteres'];
    }

    if (profileData.cpf && !validateCPF(profileData.cpf)) {
      errors.cpf = ['CPF inválido'];
    }

    if (profileData.phone && !validatePhone(profileData.phone)) {
      errors.telefone = ['Telefone inválido'];
    }

    if (profileData.birth_date && isNaN(Date.parse(profileData.birth_date))) {
      errors.data_nascimento = ['Data de nascimento inválida'];
    }

    // Validações do endereço (se fornecido)
    if (cep || logradouro || numero || bairro || cidade || estado) {
      if (!cep || !validateCEP(cep)) {
        errors.cep = ['CEP é obrigatório e deve ter 8 dígitos'];
      }
      if (!logradouro || logradouro.trim().length < 3) {
        errors.logradouro = ['Logradouro é obrigatório e deve ter pelo menos 3 caracteres'];
      }
      if (!numero || numero.trim().length < 1) {
        errors.numero = ['Número é obrigatório'];
      }
      if (!bairro || bairro.trim().length < 2) {
        errors.bairro = ['Bairro é obrigatório e deve ter pelo menos 2 caracteres'];
      }
      if (!cidade || cidade.trim().length < 2) {
        errors.cidade = ['Cidade é obrigatória e deve ter pelo menos 2 caracteres'];
      }
      if (!estado || estado.trim().length !== 2) {
        errors.estado = ['Estado é obrigatório e deve ter 2 caracteres (ex: SP)'];
      }
    }

    if (Object.keys(errors).length > 0) {
      console.log('❌ Erros de validação:', errors);
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors
      });
    }

    // Verificar se CPF já está em uso por outro usuário
    if (profileData.cpf) {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('cpf', profileData.cpf)
        .neq('id', userId)
        .single();

      if (existingUser) {
        console.log('❌ CPF já em uso por outro usuário');
        return res.status(400).json({
          success: false,
          message: 'CPF já está em uso por outro usuário',
          errors: { cpf: ['CPF já está em uso'] }
        });
      }
    }

    const results = {};

    // 1. Atualizar/Criar perfil se há dados de perfil
    if (Object.values(profileData).some(value => value !== undefined && value !== null)) {
      const updateProfileData = {
        updated_at: new Date().toISOString()
      };

      if (profileData.full_name) updateProfileData.full_name = profileData.full_name.trim();
      if (profileData.cpf) updateProfileData.cpf = profileData.cpf;
      if (profileData.phone) updateProfileData.phone = profileData.phone;
      if (profileData.birth_date) updateProfileData.birth_date = profileData.birth_date;
      if (profileData.gender) updateProfileData.gender = profileData.gender;

      console.log('📝 Atualizando user_profiles:', updateProfileData);

      // Verificar se perfil existe
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        // Atualizar perfil existente
        const { data: updatedProfile, error: profileError } = await supabase
          .from('user_profiles')
          .update(updateProfileData)
          .eq('id', userId)
          .select()
          .single();

        if (profileError) {
          console.error('❌ Erro ao atualizar perfil:', profileError);
          return res.status(500).json({
            success: false,
            message: 'Erro ao atualizar perfil',
            error: profileError.message
          });
        }

        results.profile = updatedProfile;
      } else {
        // Criar novo perfil
        const { data: newProfile, error: profileError } = await supabase
          .from('user_profiles')
          .insert({ ...updateProfileData, id: userId, email: req.user.email })
          .select()
          .single();

        if (profileError) {
          console.error('❌ Erro ao criar perfil:', profileError);
          return res.status(500).json({
            success: false,
            message: 'Erro ao criar perfil',
            error: profileError.message
          });
        }

        results.profile = newProfile;
      }
    }

    // 2. Criar/Atualizar endereço se há dados de endereço
    if (cep && logradouro && numero && bairro && cidade && estado) {
      const addressData = {
        user_id: userId,
        cep: cep.replace(/[^\d]/g, ''),
        logradouro: logradouro.trim(),
        numero: numero.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        estado: estado.trim().toUpperCase(),
        complemento: complemento ? complemento.trim() : null,
        is_default: true, // Primeiro endereço é sempre padrão
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('🏠 Criando/atualizando endereço:', addressData);

      // Verificar se já existe endereço padrão
      const { data: existingAddress } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (existingAddress) {
        // Atualizar endereço existente
        const { data: updatedAddress, error: addressError } = await supabase
          .from('user_addresses')
          .update(addressData)
          .eq('id', existingAddress.id)
          .select()
          .single();

        if (addressError) {
          console.error('❌ Erro ao atualizar endereço:', addressError);
          return res.status(500).json({
            success: false,
            message: 'Erro ao atualizar endereço',
            error: addressError.message
          });
        }

        results.address = updatedAddress;
      } else {
        // Criar novo endereço
        const { data: newAddress, error: addressError } = await supabase
          .from('user_addresses')
          .insert(addressData)
          .select()
          .single();

        if (addressError) {
          console.error('❌ Erro ao criar endereço:', addressError);
          return res.status(500).json({
            success: false,
            message: 'Erro ao criar endereço',
            error: addressError.message
          });
        }

        results.address = newAddress;
      }
    }

    console.log('✅ Configuração completa realizada com sucesso');

    res.json({
      success: true,
      message: 'Perfil configurado com sucesso',
      data: results
    });

  } catch (error) {
    console.error('❌ Erro ao configurar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * GET /api/profile-config/complete
 * Buscar dados completos do perfil (user_profiles + user_addresses)
 */
router.get('/complete', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🔍 Buscando perfil completo para usuário:', userId);

    // Buscar perfil
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Buscar endereços
    const { data: addresses, error: addressError } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar perfil:', profileError);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar perfil',
        error: profileError.message
      });
    }

    if (addressError) {
      console.error('❌ Erro ao buscar endereços:', addressError);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar endereços',
        error: addressError.message
      });
    }

    res.json({
      success: true,
      data: {
        profile: profile || null,
        addresses: addresses || [],
        user: {
          id: req.user.id,
          email: req.user.email
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar perfil completo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;

