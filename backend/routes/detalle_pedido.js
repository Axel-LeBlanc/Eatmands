const express = require('express');
const router = express.Router();
const db = require('../db');
const autenticarToken = require('../middleware/autenticacion');
const verificarPermiso = require('../middleware/permisos');

// Modificar los productos de un pedido existente
router.put('/:id/modificar-productos', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero']), async (req, res) => {
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

    //Borrar detalles anteriores
    await db.execute('DELETE FROM detalle_pedido WHERE id_pedido = ?', [id]);

    //Insertar los nuevos detalles
    for (const detalle of nuevosDetalles) {
      await db.execute(
        'INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [id, detalle.id_producto, detalle.cantidad, detalle.precio_unitario]
      );
    }

    //Actualizar el total del pedido
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
router.delete('/:id_pedido/producto/:id_producto', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero']), async (req, res) => {
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
router.put('/:id_pedido/producto/:id_producto', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero']), async (req, res) => {
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

// Agregar un nuevo producto a un pedido
router.post('/:id_pedido/producto', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero']), async (req, res) => {
  const { id_pedido } = req.params;
  const { id_producto, cantidad } = req.body;

  if (!id_producto || !cantidad || cantidad <= 0) {
    return res.status(400).json({ error: 'ID del producto y cantidad válidos requeridos' });
  }

  try {
    // Verificar que el producto existe
    const [[producto]] = await db.execute(
      'SELECT precio FROM productos WHERE id_producto = ?',
      [id_producto]
    );

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const precio_unitario = producto.precio;
    const subtotal = precio_unitario * cantidad;

    // Insertar en detalle_pedido
    await db.execute(
      'INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
      [id_pedido, id_producto, cantidad, precio_unitario]
    );

    // Recalcular y actualizar total del pedido
    const [nuevosDetalles] = await db.execute(
      'SELECT cantidad, precio_unitario FROM detalle_pedido WHERE id_pedido = ?',
      [id_pedido]
    );

    const nuevoTotal = nuevosDetalles.reduce((sum, item) => {
      return sum + item.cantidad * item.precio_unitario;
    }, 0);

    await db.execute(
      'UPDATE pedidos SET total = ? WHERE id_pedido = ?',
      [nuevoTotal, id_pedido]
    );

    res.status(201).json({
      mensaje: 'Producto añadido al pedido',
      nuevo_total: nuevoTotal,
      producto: {
        id_producto,
        cantidad,
        precio_unitario,
        subtotal
      }
    });

  } catch (error) {
    console.error('Error al añadir producto al pedido:', error);
    res.status(500).json({ error: 'Error interno al añadir producto' });
  }
});

//Exclusiones de componentes

  // Añadir exclusión de componente a un producto específico dentro de un pedido
router.post('/:id_pedido/exclusiones', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero']), async (req, res) => {
  const { id_pedido } = req.params;
  const { id_producto, id_componente } = req.body;

  if (!id_producto || !id_componente) {
    return res.status(400).json({ error: 'Faltan id_producto o id_componente' });
  }

  try {
    // Verificamos que el producto realmente pertenece al pedido
    const [[productoEnPedido]] = await db.execute(
      'SELECT * FROM detalle_pedido WHERE id_pedido = ? AND id_producto = ?',
      [id_pedido, id_producto]
    );

    if (!productoEnPedido) {
      return res.status(404).json({ error: 'El producto no está en el pedido' });
    }

    // Insertamos la exclusión si no existe
    await db.execute(`
      INSERT INTO personalizacion_detalle (id_pedido, id_producto, id_componente)
      VALUES (?, ?, ?)
    `, [id_pedido, id_producto, id_componente]);

    res.status(201).json({ mensaje: 'Componente excluido del producto exitosamente' });
  } catch (error) {
    console.error('Error al excluir componente:', error);
    res.status(500).json({ error: 'Error al registrar la exclusión' });
  }
});

// Eliminar una exclusión de componente para un producto de un pedido
router.delete('/:id_pedido/exclusiones', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero']), async (req, res) => {
  const { id_pedido } = req.params;
  const { id_producto, id_componente } = req.body;

  if (!id_producto || !id_componente) {
    return res.status(400).json({ error: 'Faltan id_producto o id_componente' });
  }

  try {
    const [result] = await db.execute(
      'DELETE FROM personalizacion_detalle WHERE id_pedido = ? AND id_producto = ? AND id_componente = ?',
      [id_pedido, id_producto, id_componente]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'La exclusión no existía' });
    }

    res.json({ mensaje: 'Exclusión eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar exclusión:', error);
    res.status(500).json({ error: 'Error al eliminar la exclusión' });
  }
});


module.exports = router;
