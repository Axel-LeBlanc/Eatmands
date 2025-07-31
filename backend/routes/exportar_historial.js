const express = require('express');
const router = express.Router();
const db = require('../db');
const ExcelJS = require('exceljs');
const autenticarToken = require('../middleware/autenticacion');
const verificarPermiso = require('../middleware/permisos');

router.get('/excel', autenticarToken, verificarPermiso(['admin', 'gerente']), async (req, res) => {
  try {
    const [registros] = await db.execute(`
      SELECT ha.id_historial, u.nombre AS usuario, ha.entidad, ha.accion, ha.descripcion, ha.fecha
      FROM historial_actividad ha
      LEFT JOIN usuarios u ON ha.id_usuario = u.id_usuario
      ORDER BY ha.fecha DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Historial de Actividad');

    // Agregar encabezados
    worksheet.columns = [
      { header: 'ID', key: 'id_historial', width: 10 },
      { header: 'Usuario', key: 'usuario', width: 25 },
      { header: 'Entidad', key: 'entidad', width: 15 },
      { header: 'Acción', key: 'accion', width: 15 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Fecha', key: 'fecha', width: 25 },
    ];

    // Agregar filas
    registros.forEach(reg => worksheet.addRow(reg));

    // Configurar respuesta como archivo descargable
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=historial_actividad.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error al generar el Excel:', error);
    res.status(500).json({ error: 'No se pudo exportar el historial' });
  }
});

module.exports = router;
