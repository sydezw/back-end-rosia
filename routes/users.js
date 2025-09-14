const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
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

// Middleware de autenticação para todas as rotas
router.use(authenticateUser);

// Rotas de perfil
router.get('/profile', UsersController.getProfile);
router.put('/profile', UsersController.updateProfile);

// Rota de upload de avatar
router.post('/avatar', upload.single('avatar'), UsersController.uploadAvatar);

// Rotas de endereços
router.get('/addresses', UsersController.getAddresses);
router.post('/addresses', UsersController.createAddress);
router.put('/addresses/:id', UsersController.updateAddress);
router.patch('/addresses/:id/default', UsersController.setDefaultAddress);
router.delete('/addresses/:id', UsersController.deleteAddress);

module.exports = router;