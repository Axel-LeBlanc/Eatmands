const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las categorías
router.get('/', (req, res) => {
  db.query('SELECT * FROM categorias', (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener categorías' });
    res.json(results);
  });
});

// Obtener una categoría por ID
router.get('/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM categorias WHERE id_categoria = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener categoría' });
    if (results.length === 0) return res.status(404).json({ mensaje: 'Categoría no encontrada' });
    res.json(results[0]);
  });
});

// Crear una nueva categoría
router.post('/', (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  db.query('INSERT INTO categorias (nombre) VALUES (?)', [nombre], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al registrar categoría' });
    res.status(201).json({ mensaje: 'Categoría creada correctamente', id: result.insertId });
  });
});

// Actualizar una categoría
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { nombre } = req.body;

  db.query('UPDATE categorias SET nombre = ? WHERE id_categoria = ?', [nombre, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar categoría' });
    res.json({ mensaje: 'Categoría actualizada correctamente' });
  });
});

// Eliminar una categoría
router.delete('/:id', (req, res) => {
  const id = req.params.id;

  db.query('DELETE FROM categorias WHERE id_categoria = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar categoría' });
    res.json({ mensaje: 'Categoría eliminada correctamente' });
  });
});

module.exports = router;
