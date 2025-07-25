const express = require('express');
const router = express.Router();
const db = require('../db');

// Modificar los productos de un pedido existente
router.put('/:id/modificar-productos', async (req, res) => {
  const { id } = req.params;
  const { nuevos_productos } = req.body;

  if (!Array.isArray(nuevos_productos) || nuevos_productos.length === 0) {
    return res.status(400).json({ error: 'Debe enviar productos válidos para actualizar el pedido' });
  }

  try {
    // Verificar que el pedido existe
    const [[pedidoExistente]] = await db.execute(
      'SELECT * FROM pedidos WHERE id_pedido = ?',
      [id]
    );

    if (!pedidoExistente) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Obtener nuevos precios
    const ids = nuevos_productos.map(p => p.id_producto);
    const [productosDB] = await db.execute(
      `SELECT id_producto, precio FROM productos WHERE id_producto IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    if (productosDB.length !== nuevos_productos.length) {
      return res.status(400).json({ error: 'Uno o más productos no existen' });
    }

    // Calcular nuevo total
    let total = 0;
    const nuevosDetalles = nuevos_productos.map(p => {
      const productoDB = productosDB.find(dbP => dbP.id_producto === p.id_producto);
      const precio = productoDB.precio;
      const subtotal = precio * p.cantidad;
      total += subtotal;
      return {
        id_producto: p.id_producto,
        cantidad: p.cantidad,
        precio_unitario: precio
      };
    });

    // 1. Borrar detalles anteriores
    await db.execute('DELETE FROM detalle_pedido WHERE id_pedido = ?', [id]);

    // 2. Insertar los nuevos detalles
    for (const detalle of nuevosDetalles) {
      await db.execute(
        'INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [id, detalle.id_producto, detalle.cantidad, detalle.precio_unitario]
      );
    }

    // 3. Actualizar el total del pedido
    await db.execute(
      'UPDATE pedidos SET total = ? WHERE id_pedido = ?',
      [total, id]
    );

    res.json({ mensaje: 'Productos del pedido actualizados correctamente', total_nuevo: total });

  } catch (error) {
    console.error('Error al modificar productos del pedido:', error);
    res.status(500).json({ error: 'Error al modificar productos del pedido' });
  }
});

//Eliminar producto específico de un pedido
router.delete('/:id_pedido/producto/:id_producto', async (req, res) => {
  const { id_pedido, id_producto } = req.params;
  try {
    const [result] = await db.execute(
      'DELETE FROM detalle_pedido WHERE id_pedido = ? AND id_producto = ?',
      [id_pedido, id_producto]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado en el pedido' });
    }

    res.json({ mensaje: 'Producto eliminado del pedido correctamente' });
  } catch (error) {
    console.error('Error al eliminar producto del pedido:', error);
    res.status(500).json({ error: 'Error interno al eliminar el producto' });
  }
});

//Actualizar cantidad de un producto
router.put('/:id_pedido/producto/:id_producto', async (req, res) => {
  const { id_pedido, id_producto } = req.params;
  const { cantidad } = req.body;

  if (cantidad <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser mayor que cero' });
  }

  try {
    const [result] = await db.execute(
      'UPDATE detalle_pedido SET cantidad = ? WHERE id_pedido = ? AND id_producto = ?',
      [cantidad, id_pedido, id_producto]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado en el pedido' });
    }

    res.json({ mensaje: 'Cantidad actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar cantidad:', error);
    res.status(500).json({ error: 'Error al actualizar cantidad del producto' });
  }
});


module.exports = router;
