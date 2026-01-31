const express = require('express');
const router = express.Router();
const { authenticateUser, authenticateToken } = require('../middleware/auth');
const UsersController = require('../controllers/UsersController');
const multer = require('multer');
const path = require('path');

// Configuração do multer para upload de avatar
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.'), false);
    }
  }
});

// Rotas de perfil com autenticação Supabase
router.get('/profile', authenticateUser, UsersController.getProfile);
router.put('/profile', authenticateUser, UsersController.updateProfile);

// ✅ CORREÇÃO: Rota profile-update usando autenticação JWT customizada (compatível com frontend)
router.put('/profile-update', authenticateUser, UsersController.updateProfileComplete);

// Rota de upload de avatar
router.post('/avatar', authenticateUser, upload.single('avatar'), UsersController.uploadAvatar);

// Rotas de endereços
router.get('/addresses', authenticateUser, UsersController.getAddresses);
router.post('/addresses', authenticateUser, UsersController.createAddress);
router.put('/addresses/:id', authenticateUser, UsersController.updateAddress);
router.patch('/addresses/:id/default', authenticateUser, UsersController.setDefaultAddress);
router.delete('/addresses/:id', authenticateUser, UsersController.deleteAddress);

module.exports = router;

