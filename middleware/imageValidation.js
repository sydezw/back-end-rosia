const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Configuração do multer para upload em memória
const storage = multer.memoryStorage();

// Filtro para validar tipos de arquivo
const fileFilter = (req, file, cb) => {
  // Tipos de imagem permitidos
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Use apenas JPEG, PNG ou WebP.'), false);
  }
};

// Configuração do multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 10 // Máximo 10 arquivos por vez
  }
});

// Middleware para upload de uma única imagem
const uploadSingle = upload.single('image');

// Middleware para upload de múltiplas imagens
const uploadMultiple = upload.array('images', 10);

// Middleware para processar e otimizar imagens
const processImage = async (req, res, next) => {
  try {
    if (!req.file && !req.files) {
      return res.status(400).json({
        error: 'Nenhuma imagem foi enviada'
      });
    }

    // Processar uma única imagem
    if (req.file) {
      const processedImage = await optimizeImage(req.file.buffer);
      req.processedImage = {
        buffer: processedImage,
        originalname: req.file.originalname,
        mimetype: 'image/webp',
        filename: `${uuidv4()}.webp`
      };
    }

    // Processar múltiplas imagens
    if (req.files && req.files.length > 0) {
      req.processedImages = [];
      
      for (const file of req.files) {
        const processedImage = await optimizeImage(file.buffer);
        req.processedImages.push({
          buffer: processedImage,
          originalname: file.originalname,
          mimetype: 'image/webp',
          filename: `${uuidv4()}.webp`
        });
      }
    }

    next();
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    res.status(500).json({
      error: 'Erro interno ao processar imagem'
    });
  }
};

// Função para otimizar imagens
const optimizeImage = async (buffer) => {
  try {
    return await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (error) {
    throw new Error('Erro ao otimizar imagem: ' + error.message);
  }
};

// Middleware para validar dados de produto com imagens
const validateProductData = (req, res, next) => {
  const { name, description, price, stock, category } = req.body;
  
  // Validações básicas
  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      error: 'Nome do produto é obrigatório e deve ter pelo menos 2 caracteres'
    });
  }
  
  if (!description || description.trim().length < 10) {
    return res.status(400).json({
      error: 'Descrição é obrigatória e deve ter pelo menos 10 caracteres'
    });
  }
  
  if (!price || isNaN(price) || parseFloat(price) <= 0) {
    return res.status(400).json({
      error: 'Preço deve ser um número válido maior que zero'
    });
  }
  
  if (!stock || isNaN(stock) || parseInt(stock) < 0) {
    return res.status(400).json({
      error: 'Estoque deve ser um número válido maior ou igual a zero'
    });
  }
  
  if (!category || category.trim().length < 2) {
    return res.status(400).json({
      error: 'Categoria é obrigatória'
    });
  }
  
  // Validar cores (se fornecidas)
  if (req.body.colors) {
    try {
      const colors = typeof req.body.colors === 'string' 
        ? JSON.parse(req.body.colors) 
        : req.body.colors;
      
      if (!Array.isArray(colors)) {
        return res.status(400).json({
          error: 'Cores devem ser um array'
        });
      }
      
      req.body.colors = colors;
    } catch (error) {
      return res.status(400).json({
        error: 'Formato de cores inválido'
      });
    }
  }
  
  // Validar tamanhos (se fornecidos)
  if (req.body.sizes) {
    try {
      const sizes = typeof req.body.sizes === 'string' 
        ? JSON.parse(req.body.sizes) 
        : req.body.sizes;
      
      if (!Array.isArray(sizes)) {
        return res.status(400).json({
          error: 'Tamanhos devem ser um array'
        });
      }
      
      req.body.sizes = sizes;
    } catch (error) {
      return res.status(400).json({
        error: 'Formato de tamanhos inválido'
      });
    }
  }
  
  next();
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  processImage,
  validateProductData,
  optimizeImage
};