const express = require('express');
const router = express.Router();
const db = require('../db');
const { registrarActividad } = require('../utils/historial');
const autenticarToken = require('../middleware/autenticacion');
const verificarPermiso = require('../middleware/permisos');

// Obtener todos los productos
router.get('/', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero', 'cajero', 'cocinero']), async (req, res) => {
  try {
    const [results] = await db.execute('SELECT * FROM productos');
    res.json(results);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Obtener un producto por ID
router.get('/:id', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero', 'cajero', 'cocinero']), async (req, res) => {
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
router.put('/:id/stock', autenticarToken, verificarPermiso(['admin', 'gerente','encargado']), async (req, res) => {

    const { id } = req.params;
    const { nuevo_stock } = req.body;
    const id_usuario = req.usuario.id_usuario;

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
      await registrarActividad(id_usuario, 'producto', 'actualizar', `Stock actualizado: ${nuevo_stock} (ID ${id})`);
      
      res.json({ mensaje: 'Stock actualizado correctamente' });
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      res.status(500).json({ error: 'Error interno al actualizar el stock' });
    }
});


// Crear un nuevo producto
router.post('/', autenticarToken, verificarPermiso(['admin', 'gerente']), async (req, res) => {
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

    await registrarHistorial(id_usuario, 'crear', 'producto', `Producto creado: ${nombre} (ID ${resultado.insertId})`);

    res.status(201).json({ mensaje: 'Producto creado correctamente', id: result.insertId });
  } catch (err) {
    console.error('Error al registrar producto:', err);
    res.status(500).json({ error: 'Error al registrar producto' });
  }
});


// Actualizar un producto por ID
router.put('/:id', autenticarToken, verificarPermiso(['admin', 'gerente']), async (req, res) => {
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

    await registrarActividad(req.usuario.id_usuario, 'producto', 'actualizar', `Producto actualizado: ${nombre} (ID ${id})`);

    res.json({ mensaje: 'Producto actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Activar o modificar descuento de un producto
router.put('/:id/activar-descuento', autenticarToken, verificarPermiso(['admin', 'gerente']), async (req, res) => {
  const { id } = req.params;
  const { descuento } = req.body;

  if (descuento == null || descuento < 0) {
    return res.status(400).json({ error: 'Descuento inválido' });
  }

  try {
    await db.execute(`
      UPDATE productos 
      SET descuento = ?, descuento_activo = 1 
      WHERE id_producto = ?
    `, [descuento, id]);

    await registrarActividad(req.usuario.id_usuario, 'producto', 'activar-descuento', `Descuento aplicado: ${descuento} (ID ${id})`);

    res.json({ mensaje: 'Descuento aplicado exitosamente' });
  } catch (error) {
    console.error('Error al aplicar descuento:', error);
    res.status(500).json({ error: 'Error al aplicar descuento' });
  }
});

// Desactivar descuento
router.put('/:id/desactivar-descuento', autenticarToken, verificarPermiso(['admin', 'gerente']), async (req, res) => {
  const { id } = req.params;

  try {
    await db.execute(`
      UPDATE productos 
      SET descuento = 0, descuento_activo = 0 
      WHERE id_producto = ?
    `, [id]);

    await registrarActividad(req.usuario.id_usuario, 'producto', 'desactivar-descuento', `Descuento desactivado (ID ${id})`);

    res.json({ mensaje: 'Descuento desactivado correctamente' });
  } catch (error) {
    console.error('Error al desactivar descuento:', error);
    res.status(500).json({ error: 'Error al desactivar descuento' });
  }
});


// Actualizar el stock manualmente para un producto
router.put('/:id/stock', autenticarToken, verificarPermiso(['admin', 'gerente']), async (req, res) => {
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

    await registrarActividad(req.usuario.id_usuario, 'producto', 'actualizar-stock', `Stock actualizado: ${stock} (ID ${id})`);

    res.json({ mensaje: 'Stock actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar el stock:', error);
    res.status(500).json({ error: 'Error al actualizar el stock del producto' });
  }
});


// Eliminar un producto por ID
router.delete('/:id', autenticarToken, verificarPermiso(['admin']), async (req, res) => {
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
