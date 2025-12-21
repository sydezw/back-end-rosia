/**
 * Teste automatizado da rota /api/auth/login/google-separated
 * Valida contrato e fluxo de perfil utilizando servidor local na porta 3030.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3030';

async function run() {
  const now = Date.now();
  const testEmail = process.env.TEST_GOOGLE_EMAIL || `teste+google-${now}@example.com`;
  const testSub = process.env.TEST_GOOGLE_SUB || `${now}`; // string numérica
  const testName = 'Teste Google Separado';

  console.log('🧪 Iniciando teste da rota google-separated...');
  console.log('➡️  POST /api/auth/login/google-separated');

  const loginResp = await fetch(`${BASE_URL}/api/auth/login/google-separated`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, sub: testSub, name: testName, email_verified: true })
  });

  if (!loginResp.ok) {
    const errText = await loginResp.text();
    throw new Error(`Falha no login: ${loginResp.status} - ${errText}`);
  }

  const loginData = await loginResp.json();
  console.log('✅ Resposta login:', loginData);

  // Asserções de contrato
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  assert(loginData.success === true, 'Contrato: success deve ser true');
  assert(typeof loginData.token === 'string' && loginData.token.length > 100, 'Contrato: token inválido');
  assert(loginData.user && loginData.user.provider === 'google-separated', 'Contrato: provider inválido');
  assert(loginData.meta && loginData.meta.contractVersion === '1.0.0', 'Contrato: versão incorreta');

  const token = loginData.token;

  console.log('➡️  GET /api/google-users/profile');
  const profileResp = await fetch(`${BASE_URL}/api/google-users/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!profileResp.ok) {
    const errText = await profileResp.text();
    throw new Error(`Falha ao obter perfil: ${profileResp.status} - ${errText}`);
  }

  const profileData = await profileResp.json();
  console.log('✅ Perfil:', profileData);

  assert(profileData && profileData.email, 'Perfil: email ausente');
  console.log('🎉 Teste concluído com sucesso! A rota está blindada por contrato.');
}

run().catch((err) => {
  console.error('❌ Teste falhou:', err.message);
  process.exit(1);
});