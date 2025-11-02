// 🔧 EXEMPLO CORRETO de como usar o profile-api.ts no Frontend

// ❌ NÃO FAÇA ISSO (importação incorreta):
// import { updateUserProfile } from './algum-arquivo-antigo';
// import { updateProfile } from './profile-api-old';

// ✅ FAÇA ISSO (importação correta):
import { updateUserProfile } from './profile-api';

// Exemplo de componente ProfileSettings.tsx corrigido
const ProfileSettings = () => {
  const [profileData, setProfileData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    data_nascimento: ''
  });
  
  const [addressData, setAddressData] = useState({
    nome_endereco: 'Endereço Principal',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: ''
  });

  // ✅ FUNÇÃO CORRETA para salvar perfil
  const handleSave = async () => {
    try {
      console.log('🔍 Iniciando atualização de perfil...');
      console.log('📤 Dados do perfil:', profileData);
      console.log('📤 Dados do endereço:', addressData);
      
      // ✅ Esta função detecta automaticamente se é usuário Google
      // e usa o endpoint correto (/api/google-users/profile-update ou /api/users/profile-update)
      const result = await updateUserProfile(profileData, addressData);
      
      console.log('✅ Perfil atualizado com sucesso:', result);
      
      // Mostrar mensagem de sucesso para o usuário
      alert('Perfil atualizado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil:', error);
      
      // Mostrar mensagem de erro para o usuário
      alert('Erro ao atualizar perfil. Tente novamente.');
    }
  };

  return (
    <div>
      {/* Seus campos de formulário aqui */}
      <button onClick={handleSave}>
        Salvar Perfil
      </button>
    </div>
  );
};

export default ProfileSettings;

// 🔍 LOGS ESPERADOS no Console do Navegador:
/*
🔍 updateUserProfile - Iniciando atualização de perfil
✅ Usuário autenticado: schoolts965@gmail.com
✅ Token obtido com sucesso
🔍 Detecção inicial - Tipo de usuário: Google
🔍 User ID do Supabase: 32c03c89-c7f0-4769-9963-7d9f0f6a3c5e
🔍 Email do usuário: schoolts965@gmail.com
🔍 FORÇANDO detecção como usuário Google para schoolts965@gmail.com
🔍 Detecção final - Tipo de usuário: Google
🔍 Usando endpoint Google: https://back-end-rosia02.vercel.app/api/google-users/profile-update
📤 Dados da requisição: {profile: {...}, address: {...}}
📥 Status da resposta: 200
✅ Perfil atualizado com sucesso
*/

// ❌ SE VOCÊ VER ESTE LOG, ESTÁ USANDO O ARQUIVO ERRADO:
/*
PUT https://back-end-rosia02.vercel.app/api/users/profile-update 400 (Bad Request)
*/

// ✅ SE VOCÊ VER ESTE LOG, ESTÁ CORRETO:
/*
PUT https://back-end-rosia02.vercel.app/api/google-users/profile-update 200 (OK)
*/

// 📋 CHECKLIST DE VERIFICAÇÃO:
// [ ] Importação: import { updateUserProfile } from './profile-api';
// [ ] Não há outras importações de updateUserProfile
// [ ] Função chamada: await updateUserProfile(profileData, addressData)
// [ ] Logs mostram "Tipo de usuário: Google"
// [ ] Logs mostram "Usando endpoint Google"
// [ ] Requisição vai para /api/google-users/profile-update
// [ ] Cache do navegador limpo (Ctrl+Shift+R)

// 🚨 IMPORTANTE:
// Se ainda estiver indo para /api/users/profile-update,
// significa que você não está usando este arquivo profile-api.ts
// Verifique se a importação está correta!

