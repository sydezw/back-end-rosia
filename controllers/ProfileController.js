const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Validação de CPF
const isValidCPF = (cpf) => {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;
  
  return true;
};

// Validação de telefone
const isValidPhone = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
  return phoneRegex.test(phone);
};

// Validação de dados do perfil
const validateProfileData = (data) => {
  const errors = [];

  // Validar nome
  if (!data.nome || data.nome.trim().length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres');
  }
  if (data.nome && data.nome.length > 255) {
    errors.push('Nome deve ter no máximo 255 caracteres');
  }
  if (data.nome && !/^[a-zA-ZÀ-ÿ\s]+$/.test(data.nome)) {
    errors.push('Nome deve conter apenas letras e espaços');
  }

  // Validar CPF
  if (data.cpf && !isValidCPF(data.cpf)) {
    errors.push('CPF inválido');
  }

  // Validar telefone
  if (data.telefone && !isValidPhone(data.telefone)) {
    errors.push('Telefone inválido');
  }

  // Validar data de nascimento
  if (data.data_nascimento) {
    const birthDate = new Date(data.data_nascimento);
    const minAge = new Date();
    minAge.setFullYear(minAge.getFullYear() - 13);
    
    if (birthDate > minAge) {
      errors.push('Idade mínima é 13 anos');
    }
    
    if (birthDate > new Date()) {
      errors.push('Data de nascimento não pode ser no futuro');
    }
  }

  return errors;
};

class ProfileController {
  // GET /api/profile
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      
      // Buscar dados do usuário no Supabase
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Erro ao buscar perfil:', userError);
        return res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }

      // Se não encontrou perfil, buscar dados básicos do auth
      if (!userData) {
        const { data: authUser, error: authError } = await supabase.auth.getUser(req.headers.authorization?.split(' ')[1]);
        
        if (authError) {
          return res.status(401).json({
            success: false,
            message: 'Token inválido'
          });
        }

        return res.json({
          success: true,
          data: {
            id: authUser.user.id,
            email: authUser.user.email,
            nome: authUser.user.user_metadata?.name || authUser.user.user_metadata?.full_name,
            avatar_url: authUser.user.user_metadata?.avatar_url,
            email_verificado: authUser.user.email_confirmed_at ? true : false,
            ultimo_login: authUser.user.last_sign_in_at,
            criadoem: authUser.user.created_at
          }
        });
      }
      
      res.json({
        success: true,
        data: userData
      });
    } catch (error) {
      console.error('Erro no getProfile:', error);
      next(error);
    }
  }

  // PUT /api/profile
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      
      // Validar dados
      const errors = validateProfileData(updateData);
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors
        });
      }

      // Verificar se CPF já existe (se fornecido)
      if (updateData.cpf) {
        const { data: existingUser, error: checkError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('cpf', updateData.cpf)
          .neq('id', userId)
          .single();

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'CPF já cadastrado por outro usuário'
          });
        }
      }

      // Preparar dados para atualização
      const dataToUpdate = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      // Atualizar perfil
      const { data: updatedUser, error: updateError } = await supabase
        .from('user_profiles')
        .update(dataToUpdate)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        // Se o perfil não existe, criar um novo
        if (updateError.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              ...dataToUpdate,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) {
            console.error('Erro ao criar perfil:', insertError);
            return res.status(500).json({
              success: false,
              message: 'Erro interno do servidor'
            });
          }

          return res.json({
            success: true,
            message: 'Perfil criado com sucesso',
            data: newProfile
          });
        }

        console.error('Erro ao atualizar perfil:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
      
      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: updatedUser
      });
    } catch (error) {
      console.error('Erro no updateProfile:', error);
      next(error);
    }
  }

  // POST /api/profile/avatar
  static async uploadAvatar(req, res, next) {
    try {
      const userId = req.user.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo não fornecido'
        });
      }

      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de arquivo não suportado. Use JPG, PNG ou WEBP'
        });
      }

      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo muito grande. Tamanho máximo: 5MB'
        });
      }

      // Upload para Supabase Storage
      const fileName = `${userId}-${Date.now()}.${file.originalname.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Erro ao fazer upload do arquivo'
        });
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Atualizar URL do avatar no perfil
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Erro ao atualizar avatar no perfil:', updateError);
        // Mesmo com erro na atualização do perfil, retornamos sucesso do upload
      }
      
      res.json({
        success: true,
        message: 'Avatar atualizado com sucesso',
        data: { avatar_url: avatarUrl }
      });
    } catch (error) {
      console.error('Erro no uploadAvatar:', error);
      next(error);
    }
  }
}

module.exports = ProfileController;

