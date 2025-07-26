const express = require('express');
const router = express.Router();
const db = require('../db');
const { registrarActividad } = require('../utils/historial');


// Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const [results] = await db.execute('SELECT * FROM productos');
    res.json(results);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Obtener un producto por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await db.execute('SELECT * FROM productos WHERE id_producto = ?', [id]);

    if (results.length === 0) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    res.json(results[0]);
  } catch (err) {
    console.error('Error al obtener producto:', err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// Actualizar el stock de un producto
router.put('/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { nuevo_stock } = req.body;

  if (typeof nuevo_stock !== 'number' || nuevo_stock < 0) {
    return res.status(400).json({ error: 'Stock inválido' });
  }

  try {
    const [result] = await db.execute(
      'UPDATE productos SET stock = ? WHERE id_producto = ?',
      [nuevo_stock, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Stock actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ error: 'Error interno al actualizar el stock' });
  }
});

// Crear un nuevo producto
router.post('/', async (req, res) => {
  const { nombre, descripcion, precio, stock, id_categoria, disponible } = req.body;

  if (!nombre || precio == null) {
    return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
  }

  const sql = `
    INSERT INTO productos (nombre, descripcion, precio, stock, id_categoria, disponible)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await db.execute(sql, [
      nombre,
      descripcion,
      precio,
      stock || 0,
      id_categoria || null,
      disponible ?? true
    ]);

    res.status(201).json({ mensaje: 'Producto creado correctamente', id: result.insertId });
  } catch (err) {
    console.error('Error al registrar producto:', err);
    res.status(500).json({ error: 'Error al registrar producto' });
  }
});


// Actualizar un producto por ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock, id_categoria, disponible } = req.body;

  const sql = `
    UPDATE productos
    SET nombre = ?, descripcion = ?, precio = ?, stock = ?, id_categoria = ?, disponible = ?
    WHERE id_producto = ?
  `;

  try {
    const [result] = await db.execute(sql, [
      nombre,
      descripcion,
      precio,
      stock,
      id_categoria,
      disponible,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Actualizar el stock manualmente para un producto
router.put('/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  if (stock == null || isNaN(stock)) {
    return res.status(400).json({ error: 'Stock inválido o no proporcionado' });
  }

  try {
    const [resultado] = await db.execute(
      'UPDATE productos SET stock = ? WHERE id_producto = ?',
      [stock, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Stock actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar el stock:', error);
    res.status(500).json({ error: 'Error al actualizar el stock del producto' });
  }
});


// Eliminar un producto por ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.execute('DELETE FROM productos WHERE id_producto = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = router;
