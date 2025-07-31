const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET
const autenticarToken = require('../middleware/autenticacion');
const verificarPermiso = require('../middleware/permisos');




// Obtener todos los usuarios
router.get('/', autenticarToken, verificarPermiso(['admin','gerente', 'encargado']), async (req, res) => {
  try {
    const [usuarios] = await db.execute('SELECT * FROM usuarios');
    res.json(usuarios);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Obtener un usuario por ID
router.get('/:id', autenticarToken, verificarPermiso(['admin','gerente', 'encargado']), async (req, res) => {
  const { id } = req.params;

    try {
      const [result] = await db.execute('SELECT * FROM usuarios WHERE id_usuario = ?', [id]);

      if (result.length === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }

      res.json(result[0]);
    } catch (err) {
      console.error('Error al obtener usuario:', err);
      res.status(500).json({ error: 'Error al obtener usuario' });
    }
  });


// Crear un nuevo usuario
router.post('/', autenticarToken, verificarPermiso(['admin','gerente', 'encargado']), async (req, res) => {
  const { nombre, correo, clave, id_rol } = req.body;

    if (!nombre || !correo || !clave || !id_rol) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
      const sql = 'INSERT INTO usuarios (nombre, correo, clave, id_rol) VALUES (?, ?, ?, ?)';
      const [result] = await db.execute(sql, [nombre, correo, clave, id_rol]);
      res.status(201).json({ mensaje: 'Usuario registrado', id: result.insertId });
    } catch (err) {
      console.error('Error al registrar usuario:', err);
      res.status(500).json({ error: 'Error al registrar usuario' });
    }
  });


// Actualizar un usuario por ID
router.put('/:id', autenticarToken, verificarPermiso(['admin', 'encargado']), async (req, res) => {
  const id = req.params.id;
    const { nombre, correo, clave, id_rol } = req.body;

    try {
      const sql = 'UPDATE usuarios SET nombre = ?, correo = ?, clave = ?, id_rol = ? WHERE id_usuario = ?';
      const [result] = await db.execute(sql, [nombre, correo, clave, id_rol, id]);
      res.json({ mensaje: 'Usuario actualizado correctamente' });
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  });



// Eliminar un usuario por ID
router.delete('/:id', autenticarToken, verificarPermiso(['admin', 'gerente']), async (req, res) => {
  const { id } = req.params;

      try {
        const [result] = await db.execute('DELETE FROM usuarios WHERE id_usuario = ?', [id]);

        if (result.affectedRows === 0) {
          return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        res.json({ mensaje: 'Usuario eliminado correctamente' });
      } catch (err) {
        console.error('Error al eliminar usuario:', err);
        res.status(500).json({ error: 'Error al eliminar usuario' });
      }
    });


module.exports = router;
