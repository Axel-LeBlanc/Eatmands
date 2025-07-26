const express = require('express');
const router = express.Router();
const db = require('../db');
const autenticarToken = require('../middleware/autenticarToken');
const verificarPermiso = require('../middleware/permisos');

// Obtener todos los roles
router.post('/', autenticarToken, verificarPermiso(['admin', 'gerente','encargado']), async (req, res) => {
    router.get('/', async (req, res) => {
    try {
        const [roles] = await db.execute('SELECT * FROM roles');
        res.json(roles);
    } catch (err) {
        console.error('Error al obtener roles:', err);
        res.status(500).json({ error: 'Error al obtener roles' });
    }
    });
  }
);

// Crear un nuevo rol
router.post('/', autenticarToken, verificarPermiso(['admin']), async (req, res) => {
    router.post('/', async (req, res) => {
    const { nombre } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'El nombre del rol es obligatorio' });
    }

    try {
        const [resultado] = await db.execute(
        'INSERT INTO roles (nombre) VALUES (?)',
        [nombre]
        );
        res.status(201).json({ mensaje: 'Rol creado correctamente', id: resultado.insertId });
    } catch (err) {
        console.error('Error al crear rol:', err);
        res.status(500).json({ error: 'Error al crear el rol' });
    }
    });
  }
);

module.exports = router;
