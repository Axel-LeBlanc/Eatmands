const express = require('express');
const router = express.Router();
const db = require('../db');

// Crear nuevo pedido con productos
router.post('/', async (req, res) => {
  const { id_usuario, productos, destinatario } = req.body;

  if (!id_usuario || !Array.isArray(productos) || productos.length === 0 || !destinatario) {
    return res.status(400).json({ error: 'Faltan campos requeridos o productos vacíos' });
  }

  try {
    // Obtener los IDs de los productos enviados
    const ids = productos.map(p => p.id_producto);
    console.log('Query:', `SELECT id_producto, precio FROM productos WHERE id_producto IN (${ids.map(() => '?').join(',')})`);
    console.log('IDs:', ids);
    console.log('Tipo de IDs:', ids.map(id => typeof id));

    // Traer los precios de los productos desde la DB
    const [productosDB] = await db.execute(
      `SELECT id_producto, precio FROM productos WHERE id_producto IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    console.log('IDs recibidos:', ids);
    if (ids.length === 0) {
      return res.status(400).json({ error: 'No se enviaron IDs de productos válidos' });
    } 

    // Calcular el total del pedido
    let total = 0;
    const detalles = productos.map(p => {
      const productoDB = productosDB.find(dbP => dbP.id_producto === p.id_producto);
      if (!productoDB) return null;

      const precio = productoDB.precio;
      const subtotal = precio * p.cantidad;
      total += subtotal;
      return {
        id_producto: p.id_producto,
        cantidad: p.cantidad,
        precio_unitario: precio
      };
    }).filter(Boolean); // Filtrar los nulos

    // Insertar el pedido
    const [resultadoPedido] = await db.execute(
      'INSERT INTO pedidos (id_usuario, total, estado, destinatario) VALUES (?, ?, ?, ?)',
      [id_usuario, total, 'pendiente', destinatario]
    );

    const id_pedido = resultadoPedido.insertId;

    // Insertar detalles del pedido
    for (const detalle of detalles) {
      await db.execute(
        'INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [id_pedido, detalle.id_producto, detalle.cantidad, detalle.precio_unitario]
      );
    }

    res.status(201).json({ mensaje: 'Pedido registrado correctamente', id_pedido, total });

  } catch (error) {
    console.error('Error al registrar el pedido:', error);  // 👈 esta línea muestra el error real
    res.status(500).json({ error: 'Error al registrar el pedido' });
  }

});

router.get('/', async (req, res) => {
  try {
    // Paso 1: Obtener pedidos y detalles
    const [pedidos] = await db.execute(`
      SELECT p.id_pedido, p.fecha, p.total, p.estado, p.destinatario, u.nombre AS mesero
      FROM pedidos p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      ORDER BY p.fecha DESC
    `);

    const [detalles] = await db.execute(`
      SELECT dp.id_pedido, pr.nombre AS producto, dp.cantidad, dp.precio_unitario
      FROM detalle_pedido dp
      JOIN productos pr ON dp.id_producto = pr.id_producto
    `);

    // Paso 2: Organizar la respuesta
    const pedidosConDetalles = pedidos.map(pedido => {
      const productos = detalles
        .filter(d => d.id_pedido === pedido.id_pedido)
        .map(p => ({
          nombre: p.producto,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          subtotal: p.precio_unitario * p.cantidad
        }));

      return {
        id_pedido: pedido.id_pedido,
        fecha: pedido.fecha,
        total: pedido.total,
        estado: pedido.estado,
        destinatario: pedido.destinatario,
        mesero: pedido.mesero,
        productos
      };
    });

    res.json(pedidosConDetalles);

  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ error: 'Error al obtener los pedidos' });
  }
});

// Obtener un pedido por ID con detalles
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[pedido]] = await db.execute(`
      SELECT p.id_pedido, p.fecha, p.total, p.estado, p.destinatario, u.nombre AS mesero
      FROM pedidos p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE p.id_pedido = ?
    `, [id]);

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const [detalles] = await db.execute(`
      SELECT pr.nombre AS producto, dp.cantidad, dp.precio_unitario
      FROM detalle_pedido dp
      JOIN productos pr ON dp.id_producto = pr.id_producto
      WHERE dp.id_pedido = ?
    `, [id]);

    const productos = detalles.map(p => ({
      nombre: p.producto,
      cantidad: p.cantidad,
      precio_unitario: p.precio_unitario,
      subtotal: p.precio_unitario * p.cantidad
    }));

    res.json({
      id_pedido: pedido.id_pedido,
      fecha: pedido.fecha,
      total: pedido.total,
      estado: pedido.estado,
      destinatario: pedido.destinatario,
      mesero: pedido.mesero,
      productos
    });
  } catch (error) {
    console.error('Error al buscar pedido por ID:', error);
    res.status(500).json({ error: 'Error interno al buscar el pedido' });
  }
});


// Cambiar el estado de un pedido
router.put('/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const estadosValidos = ['pendiente', 'en preparación', 'listo', 'entregado', 'cancelado'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }

  try {
    const [result] = await db.execute(
      'UPDATE pedidos SET estado = ? WHERE id_pedido = ?',
      [estado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    res.json({ mensaje: 'Estado del pedido actualizado correctamente' });

  } catch (error) {
    console.error('Error al actualizar estado del pedido:', error);
    res.status(500).json({ error: 'Error al actualizar el estado del pedido' });
  }
});

// Eliminar un pedido por ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM detalle_pedido WHERE id_pedido = ?', [id]);
    const [result] = await db.execute('DELETE FROM pedidos WHERE id_pedido = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    res.json({ mensaje: 'Pedido eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el pedido:', error);
    res.status(500).json({ error: 'Error al eliminar el pedido' });
  }
});


module.exports = router;
