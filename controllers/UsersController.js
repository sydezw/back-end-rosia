const { supabase } = require('../config/supabase');
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
      
      const { data: user, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, cpf, telefone, data_nascimento, avatar_url, email_verificado, criadoem, atualizadoem')
        .eq('id', userId)
        .single();
      
      if (error || !user) {
        return res.status(404).json(
          formatResponse(false, null, null, {
            code: 'USER_NOT_FOUND',
            message: 'Usuário não encontrado'
          })
        );
      }
      
      res.json(formatResponse(true, { user }));
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
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
      const { nome, cpf, telefone, data_nascimento } = req.body;
      
      // Validações
      const errors = {};
      
      if (!nome || nome.trim().length < 2) {
        errors.nome = ['Nome é obrigatório e deve ter pelo menos 2 caracteres'];
      }
      
      if (cpf && !validateCPF(cpf)) {
        errors.cpf = ['CPF inválido'];
      }
      
      if (telefone && !validatePhone(telefone)) {
        errors.telefone = ['Telefone inválido'];
      }
      
      if (data_nascimento && isNaN(Date.parse(data_nascimento))) {
        errors.data_nascimento = ['Data de nascimento inválida'];
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
      
      // Verificar se CPF já está em uso por outro usuário
      if (cpf) {
        const { data: existingUser } = await supabase
          .from('usuarios')
          .select('id')
          .eq('cpf', cpf)
          .neq('id', userId)
          .single();
        
        if (existingUser) {
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
      
      // Atualizar perfil
      const updateData = {
        nome: nome.trim(),
        atualizadoem: new Date().toISOString()
      };
      
      if (cpf) updateData.cpf = cpf;
      if (telefone) updateData.telefone = telefone;
      if (data_nascimento) updateData.data_nascimento = data_nascimento;
      
      const { data: user, error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', userId)
        .select('id, nome, email, cpf, telefone, data_nascimento, atualizadoem')
        .single();
      
      if (error) {
        console.error('Erro ao atualizar perfil:', error);
        return res.status(500).json(
          formatResponse(false, null, null, {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          })
        );
      }
      
      res.json(formatResponse(true, { user }, 'Perfil atualizado com sucesso'));
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
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
}

module.exports = UsersController;