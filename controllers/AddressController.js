const { supabase } = require('../config/supabase');

// Validação de dados de endereço
const validateAddressData = (data) => {
  const errors = [];
  
  // Nome do endereço
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Nome do endereço deve ter pelo menos 2 caracteres');
  }
  if (data.name && data.name.length > 100) {
    errors.push('Nome do endereço deve ter no máximo 100 caracteres');
  }
  
  // Logradouro
  if (!data.logradouro || data.logradouro.trim().length < 5) {
    errors.push('Logradouro deve ter pelo menos 5 caracteres');
  }
  if (data.logradouro && data.logradouro.length > 255) {
    errors.push('Logradouro deve ter no máximo 255 caracteres');
  }
  
  // Número
  if (!data.numero || data.numero.trim().length === 0) {
    errors.push('Número é obrigatório');
  }
  if (data.numero && data.numero.length > 20) {
    errors.push('Número deve ter no máximo 20 caracteres');
  }
  
  // Complemento (opcional)
  if (data.complemento && data.complemento.length > 100) {
    errors.push('Complemento deve ter no máximo 100 caracteres');
  }
  
  // Bairro
  if (!data.bairro || data.bairro.trim().length < 2) {
    errors.push('Bairro deve ter pelo menos 2 caracteres');
  }
  if (data.bairro && data.bairro.length > 100) {
    errors.push('Bairro deve ter no máximo 100 caracteres');
  }
  
  // Cidade
  if (!data.cidade || data.cidade.trim().length < 2) {
    errors.push('Cidade deve ter pelo menos 2 caracteres');
  }
  if (data.cidade && data.cidade.length > 100) {
    errors.push('Cidade deve ter no máximo 100 caracteres');
  }
  
  // Estado
  if (!data.estado || data.estado.length !== 2) {
    errors.push('Estado deve ter exatamente 2 caracteres');
  }
  
  const validStates = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  if (data.estado && !validStates.includes(data.estado.toUpperCase())) {
    errors.push('Estado inválido');
  }
  
  // CEP
  if (!data.cep) {
    errors.push('CEP é obrigatório');
  } else {
    const cepRegex = /^\d{5}-?\d{3}$/;
    if (!cepRegex.test(data.cep)) {
      errors.push('CEP deve estar no formato XXXXX-XXX ou XXXXXXXX');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

class AddressController {
  // GET /api/profile/addresses
  static async getAddresses(req, res, next) {
    try {
      const userId = req.user.id;
      
      const { data: addresses, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Erro ao buscar endereços:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
      
      res.json({
        success: true,
        data: addresses || []
      });
    } catch (error) {
      console.error('Erro no getAddresses:', error);
      next(error);
    }
  }

  // POST /api/profile/addresses
  static async createAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, logradouro, numero, complemento, bairro, cidade, estado, cep, is_default } = req.body;
      
      // Validação dos dados
      const validation = validateAddressData(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: validation.errors
        });
      }

      // Se for endereço padrão, remover padrão dos outros
      if (is_default) {
        const { error: updateError } = await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Erro ao atualizar endereços padrão:', updateError);
        }
      }
      
      // Inserir novo endereço
      const { data: newAddress, error: insertError } = await supabase
        .from('user_addresses')
        .insert({
          user_id: userId,
          name: name.trim(),
          logradouro: logradouro.trim(),
          numero: numero.trim(),
          complemento: complemento ? complemento.trim() : null,
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          estado: estado.toUpperCase(),
          cep: cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2'),
          is_default: is_default || false
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Erro ao criar endereço:', insertError);
        return res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Endereço criado com sucesso',
        data: newAddress
      });
    } catch (error) {
      console.error('Erro no createAddress:', error);
      next(error);
    }
  }

  // PUT /api/profile/addresses/:id
  static async updateAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      const { name, logradouro, numero, complemento, bairro, cidade, estado, cep } = req.body;
      
      // Validação dos dados
      const validation = validateAddressData(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: validation.errors
        });
      }

      // Verificar se o endereço pertence ao usuário
      const { data: existingAddress, error: checkError } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('id', addressId)
        .eq('user_id', userId)
        .single();
      
      if (checkError || !existingAddress) {
        return res.status(404).json({
          success: false,
          message: 'Endereço não encontrado'
        });
      }
      
      // Atualizar endereço
      const { data: updatedAddress, error: updateError } = await supabase
        .from('user_addresses')
        .update({
          name: name.trim(),
          logradouro: logradouro.trim(),
          numero: numero.trim(),
          complemento: complemento ? complemento.trim() : null,
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          estado: estado.toUpperCase(),
          cep: cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2'),
          updated_at: new Date().toISOString()
        })
        .eq('id', addressId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Erro ao atualizar endereço:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
      
      res.json({
        success: true,
        message: 'Endereço atualizado com sucesso',
        data: updatedAddress
      });
    } catch (error) {
      console.error('Erro no updateAddress:', error);
      next(error);
    }
  }

  // DELETE /api/profile/addresses/:id
  static async deleteAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      
      // Verificar se o endereço pertence ao usuário e obter informações
      const { data: addressToDelete, error: checkError } = await supabase
        .from('user_addresses')
        .select('id, is_default')
        .eq('id', addressId)
        .eq('user_id', userId)
        .single();
      
      if (checkError || !addressToDelete) {
        return res.status(404).json({
          success: false,
          message: 'Endereço não encontrado'
        });
      }
      
      // Deletar o endereço
      const { error: deleteError } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('Erro ao excluir endereço:', deleteError);
        return res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
      
      // Se era o endereço padrão, definir outro como padrão
      if (addressToDelete.is_default) {
        const { data: remainingAddresses, error: fetchError } = await supabase
          .from('user_addresses')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1);

        if (!fetchError && remainingAddresses && remainingAddresses.length > 0) {
          await supabase
            .from('user_addresses')
            .update({ is_default: true })
            .eq('id', remainingAddresses[0].id);
        }
      }
      
      res.json({
        success: true,
        message: 'Endereço excluído com sucesso'
      });
    } catch (error) {
      console.error('Erro no deleteAddress:', error);
      next(error);
    }
  }

  // PUT /api/profile/addresses/:id/default
  static async setDefaultAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      
      // Verificar se o endereço pertence ao usuário
      const { data: addressToUpdate, error: checkError } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('id', addressId)
        .eq('user_id', userId)
        .single();
      
      if (checkError || !addressToUpdate) {
        return res.status(404).json({
          success: false,
          message: 'Endereço não encontrado'
        });
      }
      
      // Remover padrão de todos os endereços do usuário
      const { error: updateAllError } = await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
      
      if (updateAllError) {
        console.error('Erro ao remover padrão dos endereços:', updateAllError);
        return res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
      
      // Definir o endereço como padrão
      const { data: updatedAddress, error: setDefaultError } = await supabase
        .from('user_addresses')
        .update({ 
          is_default: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', addressId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (setDefaultError) {
        console.error('Erro ao definir endereço padrão:', setDefaultError);
        return res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
      
      res.json({
        success: true,
        message: 'Endereço padrão definido com sucesso',
        data: updatedAddress
      });
    } catch (error) {
      console.error('Erro no setDefaultAddress:', error);
      next(error);
    }
  }
}

module.exports = AddressController;