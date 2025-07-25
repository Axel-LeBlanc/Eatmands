const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todos los usuarios
router.get('/', (req, res) => {
  db.query('SELECT * FROM usuarios', (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener usuarios' });
    res.json(results);
  });
});

// Obtener un usuario por ID
router.get('/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM usuarios WHERE id_usuario = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener usuario' });
    if (results.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json(results[0]);
  });
});

// Crear un nuevo usuario
router.post('/', (req, res) => {
  const { nombre, correo, clave, rol } = req.body;
  if (!nombre || !correo || !clave || !rol) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const sql = 'INSERT INTO usuarios (nombre, correo, clave, rol) VALUES (?, ?, ?, ?)';
  db.query(sql, [nombre, correo, clave, rol], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al registrar usuario' });
    res.status(201).json({ mensaje: 'Usuario registrado', id: result.insertId });
  });
});

// Actualizar un usuario por ID
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { nombre, correo, clave, rol } = req.body;

  const sql = 'UPDATE usuarios SET nombre = ?, correo = ?, clave = ?, rol = ? WHERE id_usuario = ?';
  db.query(sql, [nombre, correo, clave, rol, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar usuario' });
    res.json({ mensaje: 'Usuario actualizado correctamente' });
  });
});

// Eliminar un usuario por ID
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM usuarios WHERE id_usuario = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar usuario' });
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  });
});

module.exports = router;
