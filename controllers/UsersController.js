const { supabase, supabaseAdmin } = require('../config/supabase');
const { storage } = require('../config/storage');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

class UsersController {
  // GET /api/users/profile
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      
      console.log('🔍 Buscando perfil do usuário:', userId);
      
      // Buscar dados do usuário na tabela user_profiles
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.log('❌ Erro ao buscar perfil na user_profiles:', error);
        
        // Se não encontrou na user_profiles, buscar dados básicos do auth
        if (error.code === 'PGRST116') {
          console.log('📝 Perfil não encontrado, buscando dados do auth...');
          
          // Buscar dados básicos do usuário autenticado
          const authUser = req.user;
          
          return res.json(formatResponse(true, { 
            user: {
              id: authUser.id,
              email: authUser.email,
              nome: authUser.nome || authUser.full_name,
              avatar_url: authUser.avatar_url,
              email_verificado: authUser.email_verificado || false,
              criadoem: authUser.criadoem || new Date().toISOString()
            }
          }));
        }
        
        return res.status(500).json(
          formatResponse(false, null, null, {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          })
        );
      }
      
      console.log('✅ Perfil encontrado:', { id: userProfile.id, email: userProfile.email });
      
      res.json(formatResponse(true, { user: userProfile }));
    } catch (error) {
      console.error('❌ Erro ao buscar perfil:', error);
      res.status(500).json(
        formatResponse(false, null, null, {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        })
      );
    }
  }

  // PUT /api/users/profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { nome, full_name, cpf, telefone, phone, data_nascimento, birth_date, gender } = req.body;
      
      console.log('🔄 Atualizando perfil do usuário:', userId, req.body);
      
      // Normalizar campos (aceitar tanto formato antigo quanto novo)
      const normalizedData = {
        nome: (nome || full_name)?.trim(),
        cpf: cpf?.replace(/[^\d]/g, ''),
        telefone: (telefone || phone)?.replace(/[^\d]/g, ''),
        data_nascimento: birth_date || data_nascimento,
        gender: gender?.trim()
      };
      
      // Validações
      const errors = {};
      
      if (!normalizedData.nome || normalizedData.nome.length < 2) {
        errors.nome = ['Nome é obrigatório e deve ter pelo menos 2 caracteres'];
      }
      
      if (normalizedData.cpf && !validateCPF(normalizedData.cpf)) {
        errors.cpf = ['CPF inválido'];
      }
      
      if (normalizedData.telefone && !validatePhone(normalizedData.telefone)) {
        errors.telefone = ['Telefone inválido'];
      }
      
      if (normalizedData.data_nascimento && isNaN(Date.parse(normalizedData.data_nascimento))) {
        errors.data_nascimento = ['Data de nascimento inválida'];
      }
      
      if (Object.keys(errors).length > 0) {
        console.log('❌ Erros de validação:', errors);
        return res.status(400).json(
          formatResponse(false, null, null, {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: errors
          })
        );
      }
      
      // Verificar se CPF já está em uso por outro usuário
      if (normalizedData.cpf) {
        const { data: existingUser } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('cpf', normalizedData.cpf)
          .neq('id', userId)
          .single();
        
        if (existingUser) {
          console.log('❌ CPF já em uso por outro usuário');
          return res.status(400).json(
            formatResponse(false, null, null, {
              code: 'VALIDATION_ERROR',
              message: 'Dados inválidos',
              details: {
                cpf: ['CPF já está em uso']
              }
            })
          );
        }
      }
      
      // Preparar dados para atualização
      const updateData = {
        updated_at: new Date().toISOString()
      };
      
      if (normalizedData.nome) updateData.nome = normalizedData.nome;
      if (normalizedData.cpf) updateData.cpf = normalizedData.cpf;
      if (normalizedData.telefone) updateData.telefone = normalizedData.telefone;
      if (normalizedData.data_nascimento) updateData.data_nascimento = normalizedData.data_nascimento;
      if (normalizedData.gender) updateData.gender = normalizedData.gender;
      
      console.log('📝 Dados para atualização:', updateData);
      
      // Verificar se o perfil já existe
      const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();
      
      let result;
      if (existingProfile) {
        // Atualizar perfil existente
        console.log('🔄 Atualizando perfil existente');
        result = await supabaseAdmin
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', userId)
          .select()
          .single();
      } else {
        // Criar novo perfil
        console.log('📝 Criando novo perfil');
        result = await supabaseAdmin
          .from('user_profiles')
          .insert({ ...updateData, user_id: userId, email: req.user.email })
          .select()
          .single();
      }
      
      if (result.error) {
        console.error('❌ Erro ao salvar perfil:', result.error);
        return res.status(500).json(
          formatResponse(false, null, null, {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          })
        );
      }
      
      console.log('✅ Perfil atualizado com sucesso:', result.data.id);
      
      res.json(formatResponse(true, { user: result.data }, 'Perfil atualizado com sucesso'));
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil:', error);
      res.status(500).json(
        formatResponse(false, null, null, {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        })
      );
    }
  }

  // POST /api/users/avatar
  static async uploadAvatar(req, res) {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json(
          formatResponse(false, null, null, {
            code: 'VALIDATION_ERROR',
            message: 'Arquivo de avatar é obrigatório'
          })
        );
      }
      
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `avatar-${userId}-${uuidv4()}${fileExtension}`;
      const filePath = `avatars/${fileName}`;
      
      // Upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });
      
      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        return res.status(500).json(
          formatResponse(false, null, null, {
            code: 'UPLOAD_ERROR',
            message: 'Erro ao fazer upload do avatar'
          })
        );
      }
      
      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);
      
      const avatar_url = urlData.publicUrl;
      
      // Atualizar URL do avatar no banco
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ avatar_url })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Erro ao atualizar avatar_url:', updateError);
        return res.status(500).json(
          formatResponse(false, null, null, {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          })
        );
      }
      
      res.json(formatResponse(true, { avatar_url }, 'Avatar atualizado com sucesso'));
    } catch (error) {
      console.error('Erro no upload de avatar:', error);
      res.status(500).json(
        formatResponse(false, null, null, {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        })
      );
    }
  }

  // GET /api/users/addresses
  static async getAddresses(req, res) {
    try {
      const userId = req.user.id;
      
      const { data: addresses, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true)
        .order('is_default', { ascending: false })
        .order('criadoem', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar endereços:', error);
        return res.status(500).json(
          formatResponse(false, null, null, {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          })
        );
      }
      
      res.json(formatResponse(true, { addresses }));
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
      res.status(500).json(
        formatResponse(false, null, null, {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        })
      );
    }
  }

  // POST /api/users/addresses
  static async createAddress(req, res) {
    try {
      const userId = req.user.id;
      const { name, cep, logradouro, numero, complemento, bairro, cidade, estado, is_default } = req.body;
      
      // Validações
      const errors = {};
      
      if (!name || name.trim().length === 0) {
        errors.name = ['Nome do endereço é obrigatório'];
      } else if (name.length > 100) {
        errors.name = ['Nome deve ter no máximo 100 caracteres'];
      }
      
      if (!cep || !validateCEP(cep)) {
        errors.cep = ['CEP é obrigatório e deve ter formato válido'];
      }
      
      if (!logradouro || logradouro.trim().length === 0) {
        errors.logradouro = ['Logradouro é obrigatório'];
      } else if (logradouro.length > 255) {
        errors.logradouro = ['Logradouro deve ter no máximo 255 caracteres'];
      }
      
      if (!numero || numero.trim().length === 0) {
        errors.numero = ['Número é obrigatório'];
      } else if (numero.length > 20) {
        errors.numero = ['Número deve ter no máximo 20 caracteres'];
      }
      
      if (!bairro || bairro.trim().length === 0) {
        errors.bairro = ['Bairro é obrigatório'];
      } else if (bairro.length > 100) {
        errors.bairro = ['Bairro deve ter no máximo 100 caracteres'];
      }
      
      if (!cidade || cidade.trim().length === 0) {
        errors.cidade = ['Cidade é obrigatória'];
      } else if (cidade.length > 100) {
        errors.cidade = ['Cidade deve ter no máximo 100 caracteres'];
      }
      
      if (!estado || estado.length !== 2) {
        errors.estado = ['Estado é obrigatório e deve ter 2 caracteres (UF)'];
      }
      
      if (complemento && complemento.length > 255) {
        errors.complemento = ['Complemento deve ter no máximo 255 caracteres'];
      }
      
      if (Object.keys(errors).length > 0) {
        return res.status(400).json(
          formatResponse(false, null, null, {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: errors
          })
        );
      }
      
      // Se for endereço padrão, remover padrão dos outros
      if (is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', userId);
      }
      
      // Criar endereço
      const { data: address, error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: userId,
          name: name.trim(),
          cep,
          logradouro: logradouro.trim(),
          numero: numero.trim(),
          complemento: complemento ? complemento.trim() : null,
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          estado: estado.toUpperCase(),
          is_default: is_default || false
        })
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar endereço:', error);
        return res.status(500).json(
          formatResponse(false, null, null, {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          })
        );
      }
      
      res.status(201).json(formatResponse(true, { address }, 'Endereço criado com sucesso'));
    } catch (error) {
      console.error('Erro ao criar endereço:', error);
      res.status(500).json(
        formatResponse(false, null, null, {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        })
      );
    }
  }

  // PUT /api/users/addresses/:id
  static async updateAddress(req, res) {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      const { name, cep, logradouro, numero, complemento, bairro, cidade, estado, is_default } = req.body;
      
      // Verificar se o endereço pertence ao usuário
      const { data: existingAddress, error: checkError } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('id', addressId)
        .eq('user_id', userId)
        .eq('ativo', true)
        .single();
      
      if (checkError || !existingAddress) {
        return res.status(404).json(
          formatResponse(false, null, null, {
            code: 'NOT_FOUND',
            message: 'Endereço não encontrado'
          })
        );
      }
      
      // Validações (mesmas do POST)
      const errors = {};
      
      if (!name || name.trim().length === 0) {
        errors.name = ['Nome do endereço é obrigatório'];
      } else if (name.length > 100) {
        errors.name = ['Nome deve ter no máximo 100 caracteres'];
      }
      
      if (!cep || !validateCEP(cep)) {
        errors.cep = ['CEP é obrigatório e deve ter formato válido'];
      }
      
      if (!logradouro || logradouro.trim().length === 0) {
        errors.logradouro = ['Logradouro é obrigatório'];
      } else if (logradouro.length > 255) {
        errors.logradouro = ['Logradouro deve ter no máximo 255 caracteres'];
      }
      
      if (!numero || numero.trim().length === 0) {
        errors.numero = ['Número é obrigatório'];
      } else if (numero.length > 20) {
        errors.numero = ['Número deve ter no máximo 20 caracteres'];
      }
      
      if (!bairro || bairro.trim().length === 0) {
        errors.bairro = ['Bairro é obrigatório'];
      } else if (bairro.length > 100) {
        errors.bairro = ['Bairro deve ter no máximo 100 caracteres'];
      }
      
      if (!cidade || cidade.trim().length === 0) {
        errors.cidade = ['Cidade é obrigatória'];
      } else if (cidade.length > 100) {
        errors.cidade = ['Cidade deve ter no máximo 100 caracteres'];
      }
      
      if (!estado || estado.length !== 2) {
        errors.estado = ['Estado é obrigatório e deve ter 2 caracteres (UF)'];
      }
      
      if (complemento && complemento.length > 255) {
        errors.complemento = ['Complemento deve ter no máximo 255 caracteres'];
      }
      
      if (Object.keys(errors).length > 0) {
        return res.status(400).json(
          formatResponse(false, null, null, {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: errors
          })
        );
      }
      
      // Se for endereço padrão, remover padrão dos outros
      if (is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', userId);
      }
      
      // Atualizar endereço
      const { data: address, error } = await supabase
        .from('user_addresses')
        .update({
          name: name.trim(),
          cep,
          logradouro: logradouro.trim(),
          numero: numero.trim(),
          complemento: complemento ? complemento.trim() : null,
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          estado: estado.toUpperCase(),
          is_default: is_default || false,
          atualizadoem: new Date().toISOString()
        })
        .eq('id', addressId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar endereço:', error);
        return res.status(500).json(
          formatResponse(false, null, null, {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          })
        );
      }
      
      res.json(formatResponse(true, { address }, 'Endereço atualizado com sucesso'));
    } catch (error) {
      console.error('Erro ao atualizar endereço:', error);
      res.status(500).json(
        formatResponse(false, null, null, {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        })
      );
    }
  }

  // PATCH /api/users/addresses/:id/default
  static async setDefaultAddress(req, res) {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      
      // Verificar se o endereço pertence ao usuário
      const { data: existingAddress, error: checkError } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('id', addressId)
        .eq('user_id', userId)
        .eq('ativo', true)
        .single();
      
      if (checkError || !existingAddress) {
        return res.status(404).json(
          formatResponse(false, null, null, {
            code: 'NOT_FOUND',
            message: 'Endereço não encontrado'
          })
        );
      }
      
      // Remover padrão de todos os endereços
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
      
      // Definir como padrão
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Erro ao definir endereço padrão:', error);
        return res.status(500).json(
          formatResponse(false, null, null, {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          })
        );
      }
      
      res.json(formatResponse(true, null, 'Endereço definido como padrão'));
    } catch (error) {
      console.error('Erro ao definir endereço padrão:', error);
      res.status(500).json(
        formatResponse(false, null, null, {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        })
      );
    }
  }

  // DELETE /api/users/addresses/:id
  static async deleteAddress(req, res) {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      
      // Verificar se o endereço pertence ao usuário
      const { data: existingAddress, error: checkError } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('id', addressId)
        .eq('user_id', userId)
        .eq('ativo', true)
        .single();
      
      if (checkError || !existingAddress) {
        return res.status(404).json(
          formatResponse(false, null, null, {
            code: 'NOT_FOUND',
            message: 'Endereço não encontrado'
          })
        );
      }
      
      // Soft delete
      const { error } = await supabase
        .from('user_addresses')
        .update({ ativo: false })
        .eq('id', addressId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Erro ao excluir endereço:', error);
        return res.status(500).json(
          formatResponse(false, null, null, {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          })
        );
      }
      
      res.json(formatResponse(true, null, 'Endereço excluído com sucesso'));
    } catch (error) {
      console.error('Erro ao excluir endereço:', error);
      res.status(500).json(
        formatResponse(false, null, null, {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        })
      );
    }
  }

  // PUT /api/users/profile-update - Novo endpoint seguro para atualizar perfil completo
  static async updateProfileComplete(req, res) {
    try {
      const userId = req.user.id;
      const provider = req.provider || 'email'; // Detectar se é usuário Google
      const isGoogleUser = provider === 'google';
      
      const {
        // Dados do perfil (user_profiles ou google_user_profiles)
        nome,
        full_name,
        cpf,
        telefone,
        phone,
        data_nascimento,
        birth_date,
        // Dados do endereço (user_addresses ou google_user_addresses)
        nome_endereco,
        cep,
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
        complemento
      } = req.body;
      
      console.log('🔄 Atualizando perfil completo do usuário:', userId, {
        provider,
        isGoogleUser,
        profile: { nome: nome || full_name, cpf, telefone: telefone || phone, data_nascimento: data_nascimento || birth_date },
        address: { nome_endereco, cep, logradouro, numero, bairro, cidade, estado, complemento }
      });
      
      const errors = {};
      let profileUpdated = false;
      let addressUpdated = false;
      
      // ===== ATUALIZAÇÃO DO PERFIL =====
      if (nome || full_name || cpf || telefone || phone || data_nascimento || birth_date) {
        const normalizedProfileData = {
          nome: (full_name || nome)?.trim(),
          cpf: cpf?.replace(/[^\d]/g, ''),
          telefone: (phone || telefone)?.replace(/[^\d]/g, ''),
          data_nascimento: birth_date || data_nascimento
        };
        
        // Validações do perfil
        if (normalizedProfileData.nome && normalizedProfileData.nome.length < 2) {
          errors.nome = ['Nome deve ter pelo menos 2 caracteres'];
        }
        
        if (normalizedProfileData.cpf && !validateCPF(normalizedProfileData.cpf)) {
          console.log('❌ CPF inválido:', { cpf: normalizedProfileData.cpf, length: normalizedProfileData.cpf.length });
          errors.cpf = ['CPF inválido'];
        } else if (normalizedProfileData.cpf) {
          console.log('✅ CPF válido:', normalizedProfileData.cpf);
        }
        
        if (normalizedProfileData.telefone && !validatePhone(normalizedProfileData.telefone)) {
          errors.telefone = ['Telefone inválido (deve ter 10 ou 11 dígitos)'];
        }
        
        if (normalizedProfileData.data_nascimento && isNaN(Date.parse(normalizedProfileData.data_nascimento))) {
          errors.data_nascimento = ['Data de nascimento inválida'];
        }
        
        // Verificar se CPF já está em uso por outro usuário
        if (normalizedProfileData.cpf) {
          const profileTable = isGoogleUser ? 'google_user_profiles' : 'user_profiles';
          const { data: existingUser } = await supabaseAdmin
            .from(profileTable)
            .select('id')
            .eq('cpf', normalizedProfileData.cpf)
            .neq('id', userId)
            .single();
          
          if (existingUser) {
            errors.cpf = ['CPF já está em uso por outro usuário'];
          }
        }
        
        if (Object.keys(errors).length === 0) {
          // Preparar dados para atualização do perfil
          const profileUpdateData = {
            updated_at: new Date().toISOString()
          };
          
          if (normalizedProfileData.nome) profileUpdateData.nome = normalizedProfileData.nome;
          if (normalizedProfileData.cpf) profileUpdateData.cpf = normalizedProfileData.cpf;
          if (normalizedProfileData.telefone) profileUpdateData.telefone = normalizedProfileData.telefone;
          if (normalizedProfileData.data_nascimento) profileUpdateData.data_nascimento = normalizedProfileData.data_nascimento;
          
          if (isGoogleUser) {
            // Para usuários Google, usar google_user_profiles
            console.log('🔄 Fazendo upsert do perfil Google para userId:', userId);
            
            // Buscar o perfil Google existente pelo google_id ou email
            const { data: existingGoogleProfile } = await supabaseAdmin
              .from('google_user_profiles')
              .select('id')
              .or(`google_id.eq.${userId},email.eq.${req.user.email}`)
              .single();
            
            if (existingGoogleProfile) {
              // Atualizar perfil existente
              const { error: profileError } = await supabaseAdmin
                .from('google_user_profiles')
                .update(profileUpdateData)
                .eq('id', existingGoogleProfile.id);
              
              if (profileError) {
                console.error('❌ Erro ao atualizar perfil Google:', profileError);
                errors.profile = ['Erro ao atualizar dados do perfil'];
              } else {
                profileUpdated = true;
                console.log('✅ Perfil Google atualizado com sucesso');
              }
            } else {
              // Criar novo perfil Google
              const { error: profileError } = await supabaseAdmin
                .from('google_user_profiles')
                .insert({
                  ...profileUpdateData,
                  google_id: userId,
                  email: req.user.email,
                  created_at: new Date().toISOString()
                });
              
              if (profileError) {
                console.error('❌ Erro ao criar perfil Google:', profileError);
                errors.profile = ['Erro ao criar dados do perfil'];
              } else {
                profileUpdated = true;
                console.log('✅ Perfil Google criado com sucesso');
              }
            }
          } else {
            // Para usuários normais, usar user_profiles
            console.log('🔄 Fazendo upsert do perfil para userId:', userId);
            const { error: profileError } = await supabaseAdmin
               .from('user_profiles')
               .upsert({ ...profileUpdateData, id: userId, user_id: userId, email: req.user.email }, {
                 onConflict: 'id'
               });
          
            if (profileError) {
              console.error('❌ Erro ao fazer upsert do perfil:', profileError);
              errors.profile = ['Erro ao atualizar dados do perfil'];
            } else {
              profileUpdated = true;
              console.log('✅ Perfil atualizado/criado com sucesso via upsert');
            }
          }
        }
      }
      
      // ===== ATUALIZAÇÃO DO ENDEREÇO =====
      if (nome_endereco || cep || logradouro || numero || bairro || cidade || estado) {
        // Validações do endereço
        if (!cep || !validateCEP(cep)) {
          errors.cep = ['CEP inválido (deve ter 8 dígitos)'];
        }
        
        if (!logradouro?.trim()) {
          errors.logradouro = ['Logradouro é obrigatório'];
        }
        
        if (!numero?.trim()) {
          errors.numero = ['Número é obrigatório'];
        }
        
        if (!bairro?.trim()) {
          errors.bairro = ['Bairro é obrigatório'];
        }
        
        if (!cidade?.trim()) {
          errors.cidade = ['Cidade é obrigatória'];
        }
        
        if (!estado?.trim()) {
          errors.estado = ['Estado é obrigatório'];
        }
        
        if (Object.keys(errors).length === 0) {
          if (isGoogleUser) {
            // Para usuários Google, usar google_user_addresses
            console.log('🔄 Processando endereço Google para userId:', userId);
            
            // Buscar o perfil Google para obter o google_user_id
            const { data: googleProfile } = await supabaseAdmin
              .from('google_user_profiles')
              .select('id')
              .or(`google_id.eq.${userId},email.eq.${req.user.email}`)
              .single();
            
            if (!googleProfile) {
              errors.endereco = ['Perfil Google não encontrado. Atualize o perfil primeiro.'];
            } else {
              const addressData = {
                google_user_id: googleProfile.id,
                cep: cep.replace(/[^\d]/g, ''),
                logradouro: logradouro.trim(),
                numero: numero.trim(),
                bairro: bairro.trim(),
                cidade: cidade.trim(),
                estado: estado.trim(),
                complemento: complemento?.trim() || null,
                updated_at: new Date().toISOString()
              };
              
              // Verificar se já existe um endereço para este usuário Google
              const { data: existingAddress } = await supabaseAdmin
                .from('google_user_addresses')
                .select('id')
                .eq('google_user_id', googleProfile.id)
                .single();
              
              if (existingAddress) {
                // Atualizar endereço existente
                const { error: addressError } = await supabaseAdmin
                  .from('google_user_addresses')
                  .update(addressData)
                  .eq('id', existingAddress.id);
                
                if (addressError) {
                  console.error('❌ Erro ao atualizar endereço Google:', addressError);
                  errors.endereco = ['Erro ao atualizar dados do endereço'];
                } else {
                  addressUpdated = true;
                  console.log('✅ Endereço Google atualizado com sucesso');
                }
              } else {
                // Criar novo endereço
                const { error: addressError } = await supabaseAdmin
                  .from('google_user_addresses')
                  .insert({
                    ...addressData,
                    created_at: new Date().toISOString()
                  });
                
                if (addressError) {
                  console.error('❌ Erro ao criar endereço Google:', addressError);
                  errors.endereco = ['Erro ao criar dados do endereço'];
                } else {
                  addressUpdated = true;
                  console.log('✅ Endereço Google criado com sucesso');
                }
              }
            }
          } else {
            // Para usuários normais, usar user_addresses
            const addressData = {
              user_id: userId,
              name: nome_endereco?.trim() || 'Endereço Principal',
              cep: cep.replace(/[^\d]/g, ''),
              logradouro: logradouro.trim(),
              numero: numero.trim(),
              bairro: bairro.trim(),
              cidade: cidade.trim(),
              estado: estado.trim(),
              complemento: complemento?.trim() || null,
              is_default: true,
              updated_at: new Date().toISOString()
            };
            
            // Verificar se já existe um endereço padrão para este usuário
            const { data: existingAddress } = await supabaseAdmin
              .from('user_addresses')
              .select('id')
              .eq('user_id', userId)
              .eq('is_default', true)
              .single();
            
            if (existingAddress) {
              // Atualizar endereço existente
              const { error: addressError } = await supabaseAdmin
                .from('user_addresses')
                .update(addressData)
                .eq('id', existingAddress.id);
              
              if (addressError) {
                console.error('❌ Erro ao atualizar endereço:', addressError);
                errors.endereco = ['Erro ao atualizar dados do endereço'];
              } else {
                addressUpdated = true;
                console.log('✅ Endereço atualizado com sucesso');
              }
            } else {
              // Criar novo endereço
              const { error: addressError } = await supabaseAdmin
                .from('user_addresses')
                .insert(addressData);
              
              if (addressError) {
                console.error('❌ Erro ao criar endereço:', addressError);
                errors.endereco = ['Erro ao criar dados do endereço'];
              } else {
                addressUpdated = true;
                console.log('✅ Endereço criado com sucesso');
              }
            }
          }
        }
      }
      
      // Verificar se houve erros
      if (Object.keys(errors).length > 0) {
        console.log('❌ Erros de validação:', errors);
        return res.status(400).json(
          formatResponse(false, null, null, {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: errors
          })
        );
      }
      
      // Verificar se pelo menos algo foi atualizado
      if (!profileUpdated && !addressUpdated) {
        return res.status(400).json(
          formatResponse(false, null, null, {
            code: 'NO_DATA',
            message: 'Nenhum dado foi fornecido para atualização'
          })
        );
      }
      
      // Buscar dados atualizados para retornar
      let updatedProfile = null;
      let updatedAddress = null;
      
      if (isGoogleUser) {
        // Para usuários Google, buscar nas tabelas específicas
        const { data: googleProfile } = await supabaseAdmin
          .from('google_user_profiles')
          .select('*')
          .or(`google_id.eq.${userId},email.eq.${req.user.email}`)
          .single();
        
        updatedProfile = googleProfile;
        
        if (googleProfile) {
          const { data: googleAddress } = await supabaseAdmin
            .from('google_user_addresses')
            .select('*')
            .eq('google_user_id', googleProfile.id)
            .single();
          
          updatedAddress = googleAddress;
        }
      } else {
        // Para usuários normais, buscar nas tabelas padrão
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        updatedProfile = profile;
        
        const { data: address } = await supabaseAdmin
          .from('user_addresses')
          .select('*')
          .eq('user_id', userId)
          .eq('is_default', true)
          .single();
        
        updatedAddress = address;
      }
      
      const responseMessage = [];
      if (profileUpdated) responseMessage.push('perfil');
      if (addressUpdated) responseMessage.push('endereço');
      
      console.log('✅ Atualização completa realizada com sucesso');
      
      res.json(formatResponse(true, {
        user: updatedProfile,
        address: updatedAddress,
        updated: {
          profile: profileUpdated,
          address: addressUpdated
        }
      }, `Dados atualizados com sucesso: ${responseMessage.join(' e ')}`));
      
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil completo:', error);
      res.status(500).json(
        formatResponse(false, null, null, {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        })
      );
    }
  }
}

module.exports = UsersController;