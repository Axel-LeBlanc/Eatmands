const db = require('../db');


async function registrarActividad(id_usuario, entidad, accion, descripcion) {
  try {
    await db.execute(
      `INSERT INTO historial_actividad (id_usuario, entidad, accion, descripcion) VALUES (?, ?, ?, ?)`,
      [id_usuario, entidad, accion, descripcion]
    );
  } catch (error) {
    console.error('Error al registrar en historial:', error);
    // Opcional: puedes lanzar el error si quieres frenarlo, pero normalmente solo se loguea
  }
}

module.exports = { registrarActividad };