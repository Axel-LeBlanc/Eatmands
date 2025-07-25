const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todos los productos
router.get('/', (req, res) => {
  db.query('SELECT * FROM productos', (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener productos' });
    res.json(results);
  });
});

// Obtener un producto por ID
router.get('/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM productos WHERE id_producto = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener producto' });
    if (results.length === 0) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json(results[0]);
  });
});

router.get('/alerta', async (req, res) => {
  try {
    const [productos] = await db.execute(
      'SELECT *, stock < 5 AS alerta_stock FROM productos'
    );
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener los productos' });
  }
});

// Crear un nuevo producto
router.post('/', (req, res) => {
  const { nombre, descripcion, precio, stock, id_categoria, disponible } = req.body;

  if (!nombre || precio == null) {
    return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
  }

  const sql = `
    INSERT INTO productos (nombre, descripcion, precio, stock, id_categoria, disponible)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [nombre, descripcion, precio, stock || 0, id_categoria || null, disponible ?? true], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al registrar producto' });
    res.status(201).json({ mensaje: 'Producto creado correctamente', id: result.insertId });
  });
});

// Actualizar un producto por ID
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { nombre, descripcion, precio, stock, id_categoria, disponible } = req.body;

  const sql = `
    UPDATE productos
    SET nombre = ?, descripcion = ?, precio = ?, stock = ?, id_categoria = ?, disponible = ?
    WHERE id_producto = ?
  `;

  db.query(sql, [nombre, descripcion, precio, stock, id_categoria, disponible, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar producto' });
    res.json({ mensaje: 'Producto actualizado correctamente' });
  });
});

// Eliminar un producto por ID
router.delete('/:id', (req, res) => {
  const id = req.params.id;

  db.query('DELETE FROM productos WHERE id_producto = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar producto' });
    res.json({ mensaje: 'Producto eliminado correctamente' });
  });
});

module.exports = router;
