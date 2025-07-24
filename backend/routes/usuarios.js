const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todos los usuarios
router.get('/', (req, res) => {
  db.query('SELECT * FROM usuarios', (err, results) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      res.status(500).json({ error: 'Error al obtener usuarios' });
    } else {
      res.json(results);
    }
  });
});

// Registrar un nuevo usuario
router.post('/', (req, res) => {
  const { nombre, correo, clave, rol } = req.body;

  if (!nombre || !correo || !clave || !rol) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const sql = 'INSERT INTO usuarios (nombre, correo, clave, rol) VALUES (?, ?, ?, ?)';
  db.query(sql, [nombre, correo, clave, rol], (err, result) => {
    if (err) {
      console.error('Error al registrar usuario:', err);
      res.status(500).json({ error: 'Error al registrar usuario' });
    } else {
      res.status(201).json({ mensaje: 'Usuario registrado correctamente', id: result.insertId });
    }
  });
});

module.exports = router;
