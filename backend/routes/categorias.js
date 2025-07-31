const express = require('express');
const router = express.Router();
const db = require('../db');
const autenticarToken = require('../middleware/autenticacion');
const verificarPermiso = require('../middleware/permisos');

// Obtener todas las categorías
router.get('/', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero', 'cajero', 'cocinero']), async (req, res) => {
  try {
    const [categorias] = await db.execute('SELECT * FROM categorias');
    res.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});


// Obtener una categoría por ID
router.get('/:id', autenticarToken, verificarPermiso(['admin', 'gerente', 'encargado', 'mesero', 'cajero', 'cocinero']), async (req, res) => {
  const { id } = req.params;

  try {
    const [results] = await db.execute('SELECT * FROM categorias WHERE id_categoria = ?', [id]);

    if (results.length === 0) {
      return res.status(404).json({ mensaje: 'Categoría no encontrada' });
    }

    res.json(results[0]);

  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({ error: 'Error al obtener categoría' });
  }
});


// Crear una nueva categoría
router.post('/', autenticarToken, verificarPermiso(['admin', 'gerente']), async (req, res) => {
  const { nombre } = req.body;
  const id_usuario = req.usuario.id_usuario;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO categorias (nombre) VALUES (?)',
      [nombre]
    );

    await registrarActividad(id_usuario, 'categoria', 'crear', `Categoría creada: ${nombre} (ID ${result.insertId})`);

    res.status(201).json({
      mensaje: 'Categoría creada correctamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error al registrar categoría:', error);
    res.status(500).json({ error: 'Error al registrar categoría' });
  }
});


// Actualizar una categoría
router.put('/:id', autenticarToken, verificarPermiso(['admin', 'gerente']), async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  const id_usuario = req.usuario.id_usuario;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    const [result] = await db.execute(
      'UPDATE categorias SET nombre = ? WHERE id_categoria = ?',
      [nombre, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Categoría no encontrada' });
    }
    await registrarActividad(id_usuario, 'categoria', 'actualizar', `Categoría actualizada: ${nombre} (ID ${id})`);
    
    res.json({ mensaje: 'Categoría actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// Eliminar una categoría
router.delete('/:id', autenticarToken, verificarPermiso(['admin']), async (req, res) => {
  const { id } = req.params;
  const id_usuario = req.usuario.id_usuario;

  try {
    const [result] = await db.execute(
      'DELETE FROM categorias WHERE id_categoria = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Categoría no encontrada' });
    }
    await registrarActividad(id_usuario, 'categoria', 'eliminar', `Categoría eliminada: ${id}`);
    
    res.json({ mensaje: 'Categoría eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});


module.exports = router;
