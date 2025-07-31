const express = require('express');
const router = express.Router();
const db = require('../db');
const autenticarToken = require('../middleware/autenticacion');
const verificarPermiso = require('../middleware/permisos');

// Obtener historial con filtros opcionales
router.get('/', autenticarToken, verificarPermiso(['admin', 'gerente']), async (req, res) => {
  const { entidad, accion, id_usuario, desde, hasta } = req.query;

  const condiciones = [];
  const valores = [];

  if (entidad) {
    condiciones.push('entidad = ?');
    valores.push(entidad);
  }

  if (accion) {
    condiciones.push('accion = ?');
    valores.push(accion);
  }

  if (id_usuario) {
    condiciones.push('id_usuario = ?');
    valores.push(id_usuario);
  }

  if (desde && hasta) {
    condiciones.push('fecha BETWEEN ? AND ?');
    valores.push(desde, hasta);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const [resultados] = await db.execute(`
      SELECT ha.*, u.nombre AS nombre_usuario
      FROM historial_actividad ha
      LEFT JOIN usuarios u ON ha.id_usuario = u.id_usuario
      ${where}
      ORDER BY fecha DESC
    `, valores);

    res.json(resultados);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

module.exports = router;
