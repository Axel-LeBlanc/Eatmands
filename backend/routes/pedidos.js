const express = require('express');
const router = express.Router();
const db = require('../db');
const autenticarToken = require('../middleware/autenticacion');
const verificarPermiso = require('../middleware/permisos');

// Crear nuevo pedido
router.post('/', autenticarToken, verificarPermiso(['admin', 'gerente', 'mesero', 'encargado']), async (req, res) => {
    const id_usuario = req.usuario.id_usuario;
    const {productos, destinatario, descuento_total = 0 } = req.body;

  if (!id_usuario || !Array.isArray(productos) || productos.length === 0 || !destinatario) {
    return res.status(400).json({ error: 'Faltan campos requeridos o productos vacíos' });
  }

  try {
    // Agrupar productos duplicados
    const productosAgrupados = productos.reduce((acc, producto) => {
      const existente = acc.find(p => p.id_producto === producto.id_producto && p.observacion === producto.observacion);
      if (existente) {
        existente.cantidad += producto.cantidad;
      } else {
        acc.push({ ...producto });
      }
      return acc;
    }, []);

    // Obtener los IDs
    const ids = productosAgrupados.map(p => p.id_producto);

    const [productosDB] = await db.execute(
      `SELECT id_producto, precio FROM productos WHERE id_producto IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    // Validar stock disponible antes de continuar
    for (const p of productosAgrupados) {
      const productoDB = productosDB.find(dbP => dbP.id_producto === p.id_producto);
      if (!productoDB) {
        return res.status(400).json({ error: `Producto con ID ${p.id_producto} no encontrado en base de datos` });
      }

      if (p.cantidad > productoDB.stock) {
        return res.status(400).json({
          error: `No hay suficiente stock para el producto con ID ${p.id_producto}. Stock disponible: ${productoDB.stock}`
        });
      }
    }

    // Calcular total del pedido
    let total = 0;
    const detalles = productosAgrupados.map(p => {
      const productoDB = productosDB.find(dbP => dbP.id_producto === p.id_producto);
      if (!productoDB) return null;

      const precio = productoDB.precio;
      const descuento = p.descuento || 0;
      const precioConDescuento = precio - descuento;

      const subtotal = precioConDescuento * p.cantidad;
      total += subtotal;

      return {
        id_producto: p.id_producto,
        cantidad: p.cantidad,
        precio_unitario: precio,
        descuento: descuento,
        observacion: p.observacion || null
      };
    }).filter(Boolean);

    // Aplicar descuento total al pedido si existe
    total = total - descuento_total;

    // Insertar pedido
    const [resultadoPedido] = await db.execute(
      'INSERT INTO pedidos (id_usuario, total, estado, destinatario, descuento_total) VALUES (?, ?, ?, ?, ?)',
      [id_usuario, total, 'pendiente', destinatario, descuento_total]
    );

    const id_pedido = resultadoPedido.insertId;

    // Insertar detalles
    for (const detalle of detalles) {
      await db.execute(
        'INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, observacion, descuento) VALUES (?, ?, ?, ?, ?, ?)',
        [id_pedido, detalle.id_producto, detalle.cantidad, detalle.precio_unitario, detalle.observacion, detalle.descuento]
      );
    }

    // Actualizar el stock de cada producto
    for (const detalle of detalles) {
      await db.execute(
        'UPDATE productos SET stock = stock - ? WHERE id_producto = ?',
        [detalle.cantidad, detalle.id_producto]
      );
    }

    await registrarActividad(id_usuario, 'pedido', 'crear', `Pedido creado: ID ${id_pedido}, Total: $${total}`);

    res.status(201).json({ mensaje: 'Pedido registrado correctamente', id_pedido, total });

  } catch (error) {
    console.error('Error al registrar el pedido:', error);
    res.status(500).json({ error: 'Error al registrar el pedido' });
  }

});


// Obtener todos los pedidos con sus detalles
router.get('/', autenticarToken, verificarPermiso(['admin', 'gerente', 'mesero', 'encargado', 'cajero', 'cocinero']), async (req, res) => {
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

//Obtener pedido completo por ID 
router.get('/:id', autenticarToken, verificarPermiso(['admin', 'gerente', 'mesero', 'encargado', 'cajero']), async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Buscar el pedido general
    const [[pedido]] = await db.execute(`
      SELECT p.id_pedido, p.fecha, p.total, p.estado, p.destinatario, u.nombre AS mesero
      FROM pedidos p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE p.id_pedido = ?
    `, [id]);

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // 2. Buscar productos del pedido
    const [productosDB] = await db.execute(`
      SELECT dp.id_producto, pr.nombre AS producto, dp.cantidad, dp.precio_unitario, dp.observacion
      FROM detalle_pedido dp
      JOIN productos pr ON dp.id_producto = pr.id_producto
      WHERE dp.id_pedido = ?
    `, [id]);

    // 3. Buscar componentes excluidos por producto
    const [componentesExcluidos] = await db.execute(`
      SELECT pd.id_producto, c.nombre AS componente
      FROM personalizacion_detalle pd
      JOIN componentes c ON pd.id_componente = c.id_componente
      WHERE pd.id_pedido = ?
    `, [id]);

    // 4. Construir respuesta completa de productos
    const productos = productosDB.map(p => {
      const excluidos = componentesExcluidos
        .filter(c => c.id_producto === p.id_producto)
        .map(c => c.componente);

      return {
        nombre: p.producto,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
        subtotal: p.precio_unitario * p.cantidad,
        observacion: p.observacion || null,
        componentes_excluidos: excluidos
      };
    });

    // 5. Responder con el pedido completo
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
router.put('/:id/estado', autenticarToken, verificarPermiso(['admin', 'gerente', 'mesero', 'encargado', 'cajero', 'cocinero']), async (req, res) => {
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

// Obtener pedidos que cambiaron de estado en los últimos X segundos
router.get('/notificaciones/recientes', autenticarToken, verificarPermiso(['admin', 'gerente', 'mesero', 'encargado', 'cajero', 'cocinero']), async (req, res) => {
  const { segundos = 5 } = req.query; // Valor por defecto: últimos 5 segundos

  try {
    const [resultados] = await db.execute(`
      SELECT p.id_pedido, p.estado, p.fecha_actualizacion, u.nombre AS mesero
      FROM pedidos p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE TIMESTAMPDIFF(SECOND, p.fecha_actualizacion, NOW()) <= ?
      ORDER BY p.fecha_actualizacion DESC
    `, [segundos]);

    res.json(resultados);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener cambios recientes' });
  }
});



// Cancelar un pedido por ID (solo cambia el estado)
router.patch('/cancelar/:id', autenticarToken, verificarPermiso(['admin', 'gerente', 'mesero', 'encargado', 'cajero']), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.execute(
      'UPDATE pedidos SET estado = ? WHERE id_pedido = ?',
      ['cancelado', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    res.json({ mensaje: 'Pedido cancelado correctamente' });
  } catch (error) {
    console.error('Error al cancelar pedido:', error);
    res.status(500).json({ error: 'Error al cancelar el pedido' });
  }
});


// Eliminar un pedido por ID
router.delete('/:id', autenticarToken, verificarPermiso(['admin', 'gerente']), async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM detalle_pedido WHERE id_pedido = ?', [id]);
    const [result] = await db.execute('DELETE FROM pedidos WHERE id_pedido = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }


    await registrarActividad(id_usuario, 'pedidos', 'eliminar', `Pedido eliminado: ${id}`);

    res.json({ mensaje: 'Pedido eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el pedido:', error);
    res.status(500).json({ error: 'Error al eliminar el pedido' });
  }
});


module.exports = router;
