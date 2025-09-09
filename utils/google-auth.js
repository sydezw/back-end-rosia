// utils/google-auth.js
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifica e valida token do Google OAuth
 * @param {string} token - Token ID do Google
 * @returns {Promise<Object>} Payload do token verificado
 * @throws {Error} Se o token for inválido
 */
const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (error) {
    throw new Error('Token do Google inválido');
  }
};

module.exports = {
  verifyGoogleToken
};