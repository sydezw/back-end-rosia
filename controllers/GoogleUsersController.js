const { supabase, supabaseAdmin } = require('../config/supabase');

class GoogleUsersController {
    // Buscar perfil completo do usuário Google (dados pessoais + endereço)
    static async getProfile(req, res) {
        try {
            // Usar dados do middleware de autenticação que já carregou tudo
            const googleUser = req.user;
            
            if (!googleUser) {
                return res.status(401).json({ 
                    error: 'Usuário Google não autenticado' 
                });
            }

            console.log('✅ Retornando dados do usuário Google:', {
                id: googleUser.id,
                email: googleUser.email,
                hasAddress: !!googleUser.address
            });

            // Retornar dados que já foram carregados pelo middleware
            res.json({ 
                success: true,
                data: {
                    profile: {
                        id: googleUser.id,
                        email: googleUser.email,
                        nome: googleUser.nome,
                        telefone: googleUser.telefone,
                        cpf: googleUser.cpf,
                        data_nascimento: googleUser.data_nascimento,
                        google_id: googleUser.google_id,
                        isGoogleUser: true,
                        created_at: googleUser.created_at,
                        updated_at: googleUser.updated_at
                    },
                    address: googleUser.address
                }
            });
        } catch (error) {
            console.error('Erro no getProfile:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor' 
            });
        }
    }

    // Criar ou atualizar perfil completo do usuário Google
    static async updateProfileComplete(req, res) {
        try {
            const googleUser = req.user;
            const { profile, address } = req.body;

            if (!googleUser) {
                return res.status(401).json({ 
                    error: 'Usuário Google não autenticado' 
                });
            }

            if (!profile || !address) {
                return res.status(400).json({ 
                    error: 'Dados de perfil e endereço são obrigatórios' 
                });
            }

            // Validar CPF se fornecido
            if (profile.cpf) {
                const { data: existingCpf } = await supabaseAdmin
                    .from('google_user_profiles')
                    .select('id')
                    .eq('cpf', profile.cpf)
                    .neq('id', googleUser.id)
                    .single();

                if (existingCpf) {
                    return res.status(400).json({ 
                        error: 'CPF já está em uso por outro usuário' 
                    });
                }
            }

            // Atualizar perfil existente
            const { data: profileData, error: profileError } = await supabaseAdmin
                .from('google_user_profiles')
                .update({
                    nome: profile.nome,
                    telefone: profile.telefone,
                    cpf: profile.cpf,
                    data_nascimento: profile.data_nascimento
                })
                .eq('id', googleUser.id)
                .select()
                .single();

            if (profileError) {
                console.error('Erro ao criar/atualizar perfil Google:', profileError);
                return res.status(500).json({ 
                    error: 'Erro ao salvar perfil' 
                });
            }

            console.log('Perfil Google atualizado/criado com sucesso:', profileData.id);

            // Verificar se já existe endereço
            console.log('🔍 [updateAddress] Verificando endereço existente para user_id:', googleUser.id);
            const { data: existingAddress, error: searchError } = await supabaseAdmin
                .from('google_user_addresses')
                .select('id')
                .eq('google_user_id', googleUser.id)
                .single();
            
            console.log('🔍 [updateAddress] Resultado da busca:', {
                existingAddress,
                searchError: searchError?.message,
                hasExisting: !!existingAddress
            });

            let addressData;
            if (existingAddress) {
                // Atualizar endereço existente
                const { data, error: addressError } = await supabaseAdmin
                    .from('google_user_addresses')
                    .update({
                        logradouro: address.logradouro,
                        numero: address.numero,
                        bairro: address.bairro,
                        cidade: address.cidade,
                        estado: address.estado,
                        cep: address.cep,
                        complemento: address.complemento
                    })
                    .eq('id', existingAddress.id)
                    .select()
                    .single();

                if (addressError) {
                    console.error('Erro ao atualizar endereço Google:', addressError);
                    return res.status(500).json({ 
                        error: 'Erro ao atualizar endereço' 
                    });
                }
                addressData = data;
            } else {
                // Criar novo endereço
                const { data, error: addressError } = await supabaseAdmin
                     .from('google_user_addresses')
                     .insert({
                        google_user_id: googleUser.id,
                        logradouro: address.logradouro,
                        numero: address.numero,
                        bairro: address.bairro,
                        cidade: address.cidade,
                        estado: address.estado,
                        cep: address.cep,
                        complemento: address.complemento
                    })
                    .select()
                    .single();

                if (addressError) {
                    console.error('Erro ao criar endereço Google:', addressError);
                    return res.status(500).json({ 
                        error: 'Erro ao criar endereço' 
                    });
                }
                addressData = data;
            }

            console.log('Endereço Google processado com sucesso:', addressData.id);

            res.json({
                success: true,
                data: {
                    message: 'Perfil e endereço atualizados com sucesso',
                    profile: profileData,
                    address: addressData
                }
            });

        } catch (error) {
            console.error('Erro no updateProfileComplete:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor' 
            });
        }
    }

    // NOVO ENDPOINT: Atualizar apenas dados pessoais do usuário Google
    static async updatePersonalData(req, res) {
        try {
            const googleUser = req.user;
            const { nome, email, cpf, telefone, data_nascimento } = req.body;

            if (!googleUser) {
                return res.status(401).json({ 
                    error: 'Usuário Google não autenticado' 
                });
            }

            // Validar campos obrigatórios
            if (!nome || !email || !cpf || !telefone || !data_nascimento) {
                return res.status(400).json({ 
                    error: 'Todos os campos são obrigatórios: nome, email, cpf, telefone, data_nascimento' 
                });
            }

            // Validar CPF se fornecido
            if (cpf) {
                const { data: existingCpf } = await supabaseAdmin
                    .from('google_user_profiles')
                    .select('id')
                    .eq('cpf', cpf)
                    .neq('id', googleUser.id)
                    .single();

                if (existingCpf) {
                    return res.status(400).json({ 
                        error: 'CPF já está em uso por outro usuário' 
                    });
                }
            }

            // Atualizar dados pessoais
            const { data: profileData, error: profileError } = await supabaseAdmin
                .from('google_user_profiles')
                .update({
                    nome,
                    email,
                    cpf,
                    telefone,
                    data_nascimento
                })
                .eq('id', googleUser.id)
                .select()
                .single();

            if (profileError) {
                console.error('Erro ao atualizar dados pessoais Google:', profileError);
                return res.status(500).json({ 
                    error: 'Erro ao salvar dados pessoais' 
                });
            }

            console.log('Dados pessoais Google atualizados com sucesso:', profileData.id);

            res.json({
                success: true,
                data: {
                    message: 'Dados pessoais atualizados com sucesso',
                    profile: profileData
                }
            });

        } catch (error) {
            console.error('Erro no updatePersonalData:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor' 
            });
        }
    }

    // NOVO ENDPOINT: Atualizar apenas endereço do usuário Google
    static async updateAddress(req, res) {
        try {
            const googleUser = req.user;
            const { cep, logradouro, numero, bairro, cidade, estado, complemento } = req.body;

            console.log('🏠 [updateAddress] Iniciando atualização de endereço');
            console.log('👤 [updateAddress] GoogleUser:', {
                id: googleUser?.id,
                email: googleUser?.email,
                exists: !!googleUser
            });
            console.log('📦 [updateAddress] Dados recebidos:', {
                cep, logradouro, numero, bairro, cidade, estado, complemento
            });

            if (!googleUser) {
                console.log('❌ [updateAddress] Usuário Google não autenticado');
                return res.status(401).json({ 
                    error: 'Usuário Google não autenticado' 
                });
            }

            // Validar campos obrigatórios
            if (!cep || !logradouro || !numero || !bairro || !cidade || !estado) {
                console.log('❌ [updateAddress] Campos obrigatórios faltando:', {
                    cep: !!cep, logradouro: !!logradouro, numero: !!numero,
                    bairro: !!bairro, cidade: !!cidade, estado: !!estado
                });
                return res.status(400).json({ 
                    error: 'Campos obrigatórios: cep, logradouro, numero, bairro, cidade, estado' 
                });
            }

            // Verificar se já existe endereço
            const { data: existingAddress } = await supabaseAdmin
                .from('google_user_addresses')
                .select('id')
                .eq('google_user_id', googleUser.id)
                .single();

            let addressData;
            if (existingAddress) {
                // Atualizar endereço existente
                console.log('🔄 [updateAddress] Atualizando endereço existente ID:', existingAddress.id);
                const { data, error: addressError } = await supabaseAdmin
                     .from('google_user_addresses')
                     .update({
                        cep,
                        logradouro,
                        numero,
                        bairro,
                        cidade,
                        estado,
                        complemento: complemento || null
                    })
                    .eq('id', existingAddress.id)
                    .select()
                    .single();

                console.log('🔄 [updateAddress] Resultado da atualização:', {
                    data,
                    error: addressError?.message,
                    success: !addressError
                });

                if (addressError) {
                    console.error('❌ [updateAddress] Erro ao atualizar endereço Google:', addressError);
                    return res.status(500).json({ 
                        error: 'Erro ao atualizar endereço',
                        details: addressError.message
                    });
                }
                addressData = data;
            } else {
                // Criar novo endereço
                console.log('➕ [updateAddress] Criando novo endereço para user_id:', googleUser.id);
                const insertData = {
                    google_user_id: googleUser.id,
                    cep,
                    logradouro,
                    numero,
                    bairro,
                    cidade,
                    estado,
                    complemento: complemento || null
                };
                console.log('➕ [updateAddress] Dados para inserção:', insertData);
                
                const { data, error: addressError } = await supabaseAdmin
                    .from('google_user_addresses')
                    .insert(insertData)
                    .select()
                    .single();

                console.log('➕ [updateAddress] Resultado da inserção:', {
                    data,
                    error: addressError?.message,
                    success: !addressError
                });

                if (addressError) {
                    console.error('❌ [updateAddress] Erro ao criar endereço Google:', addressError);
                    return res.status(500).json({ 
                        error: 'Erro ao criar endereço',
                        details: addressError.message
                    });
                }
                addressData = data;
            }

            console.log('✅ [updateAddress] Endereço Google processado com sucesso:', {
                id: addressData?.id,
                addressData
            });

            res.json({
                success: true,
                data: {
                    message: 'Endereço atualizado com sucesso',
                    address: addressData
                }
            });

        } catch (error) {
            console.error('Erro no updateAddress:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor' 
            });
        }
    }

    // Buscar endereços do usuário Google
    static async getAddresses(req, res) {
        try {
            const googleUser = req.user;
            
            if (!googleUser) {
                return res.status(401).json({ 
                    error: 'Usuário Google não autenticado' 
                });
            }

            const { data: addresses, error } = await supabase
                .from('google_user_addresses')
                .select('*')
                .eq('google_user_id', googleUser.id);

            if (error) {
                console.error('Erro ao buscar endereços Google:', error);
                return res.status(500).json({ 
                    error: 'Erro interno do servidor' 
                });
            }

            res.json({
                success: true,
                data: {
                    addresses: addresses || []
                }
            });
        } catch (error) {
            console.error('Erro no getAddresses:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor' 
            });
        }
    }
}

module.exports = GoogleUsersController;

