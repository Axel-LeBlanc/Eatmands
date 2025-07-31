const express = require('express');
const router = express.Router();
const db = require('../db');
const autenticarToken = require('../middleware/autenticacion');
const verificarPermiso = require('../middleware/permisos');

// Obtener pedidos filtrados por estado
router.get('/', autenticarToken, verificarPermiso(['admin', 'gerente', 'mesero', 'encargado', 'cocinero', 'cajero']), async (req, res) => {
  const { estado } = req.query;

  try {
    let query = `
      SELECT p.id_pedido, p.fecha, p.total, p.estado, p.destinatario, u.nombre AS mesero
      FROM pedidos p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
    `;
    const params = [];

    if (estado) {
      query += ` WHERE p.estado = ?`;
      params.push(estado);
    }

    const [pedidos] = await db.execute(query, params);

    res.json(pedidos);
  } catch (error) {
    console.error('Error al filtrar pedidos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos filtrados' });
  }
});


// Filtro por rango de fechas
router.get('/fecha', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado']), async (req, res) => {
  const { inicio, fin } = req.query;

  if (!inicio || !fin) {
    return res.status(400).json({ error: 'Debes proporcionar las fechas "inicio" y "fin"' });
  }

  try {
    const [resultados] = await db.execute(
      `SELECT p.*, u.nombre AS mesero
       FROM pedidos p
       JOIN usuarios u ON p.id_usuario = u.id_usuario
       WHERE DATE(p.fecha) BETWEEN ? AND ?`,
      [inicio, fin]
    );
    res.json(resultados);
  } catch (error) {
    console.error('Error al filtrar por fecha:', error);
    res.status(500).json({ error: 'Error al filtrar pedidos por fecha' });
  }
});

// Filtro por nombre de mesero
router.get('/mesero/:nombre', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'cocinero', 'mesero', 'cajero']), async (req, res) => {
  const { nombre } = req.params;

  try {
    const [resultados] = await db.execute(
      `SELECT p.*, u.nombre AS mesero
       FROM pedidos p
       JOIN usuarios u ON p.id_usuario = u.id_usuario
       WHERE u.nombre LIKE ?`,
      [`%${nombre}%`]
    );
    res.json(resultados);
  } catch (error) {
    console.error('Error al filtrar por mesero:', error);
    res.status(500).json({ error: 'Error al filtrar pedidos por mesero' });
  }
});

// Filtro por nombre de producto
router.get('/producto/:nombre', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero', 'cajero']), async (req, res) => {
  const { nombre } = req.params;

  try {
    const [resultados] = await db.execute(
      `SELECT DISTINCT p.*
       FROM pedidos p
       JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
       JOIN productos pr ON dp.id_producto = pr.id_producto
       WHERE pr.nombre LIKE ?`,
      [`%${nombre}%`]
    );
    res.json(resultados);
  } catch (error) {
    console.error('Error al filtrar por producto:', error);
    res.status(500).json({ error: 'Error al filtrar pedidos por producto' });
  }
});

// Filtro por categoría
router.get('/categoria/:id', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero', 'cajero']), async (req, res) => {
  const { id } = req.params;

  try {
    const [resultados] = await db.execute(
      `SELECT DISTINCT p.*
       FROM pedidos p
       JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
       JOIN productos pr ON dp.id_producto = pr.id_producto
       WHERE pr.id_categoria = ?`,
      [id]
    );
    res.json(resultados);
  } catch (error) {
    console.error('Error al filtrar por categoría:', error);
    res.status(500).json({ error: 'Error al filtrar pedidos por categoría' });
  }
});

// Filtro por precio total de pedido
router.get('/precio', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero', 'cajero']), async (req, res) => {
  const { min, max } = req.query;

  if (min == null || max == null) {
    return res.status(400).json({ error: 'Debes proporcionar "min" y "max"' });
  }

  try {
    const [resultados] = await db.execute(
      `SELECT * FROM pedidos
       WHERE total BETWEEN ? AND ?`,
      [min, max]
    );
    res.json(resultados);
  } catch (error) {
    console.error('Error al filtrar por precio:', error);
    res.status(500).json({ error: 'Error al filtrar pedidos por precio' });
  }
});


module.exports = router;