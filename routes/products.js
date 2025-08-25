const express = require('express');
const { supabase } = require('../config/supabase');
const router = express.Router();

/**
 * GET /products
 * Lista todos os produtos disponíveis
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .gte('stock', 0)
      .order('created_at', { ascending: false });

    // Filtro por categoria
    if (category) {
      query = query.eq('category', category);
    }

    // Busca por nome ou descrição
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Paginação
    query = query.range(offset, offset + limit - 1);

    const { data: products, error, count } = await query;

    if (error) {
      throw error;
    }

    // Buscar total de produtos para paginação
    const { count: totalCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .gte('stock', 0);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products/:id
 * Busca um produto específico por ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validar se ID é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'ID do produto inválido',
        code: 'INVALID_PRODUCT_ID'
      });
    }

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Produto não encontrado',
          code: 'PRODUCT_NOT_FOUND'
        });
      }
      throw error;
    }

    // Verificar se produto está em estoque
    if (product.stock <= 0) {
      return res.status(404).json({
        error: 'Produto fora de estoque',
        code: 'OUT_OF_STOCK'
      });
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products/categories
 * Lista todas as categorias disponíveis
 */
router.get('/meta/categories', async (req, res, next) => {
  try {
    const { data: categories, error } = await supabase
      .from('products')
      .select('category')
      .eq('active', true)
      .gte('stock', 0);

    if (error) {
      throw error;
    }

    // Extrair categorias únicas
    const uniqueCategories = [...new Set(categories.map(item => item.category))]
      .filter(category => category) // Remove valores null/undefined
      .sort();

    res.json({ categories: uniqueCategories });
  } catch (error) {
    next(error);
  }
});

module.exports = router;