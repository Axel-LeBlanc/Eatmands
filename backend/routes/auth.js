const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const autenticarToken = require('../middleware/autenticacion');
const verificarPermiso = require('../middleware/permisos');

// Login de usuario
router.post('/login', async (req, res) => {
  const { correo, clave } = req.body;

  if (!correo || !clave) {
    return res.status(400).json({ error: 'Correo y clave son requeridos' });
  }

  try {
    const [rows] = await db.execute(`
      SELECT u.id_usuario, u.nombre, u.correo, r.nombre AS rol
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id_rol
      WHERE u.correo = ? AND u.clave = ?
    `, [correo, clave]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = rows[0];

    // Firmar token con id y rol
    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        rol: usuario.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Marcar como activo y registrar hora
    await db.execute(`
      UPDATE usuarios
      SET ultima_sesion = NOW(), activo = 1
      WHERE id_usuario = ?
    `, [usuario.id_usuario]);

    res
      .cookie('token', token, {
        httpOnly: true,
        secure: false, // cámbialo a true si usas HTTPS
        sameSite: 'Strict', // o 'Strict' si quieres más seguridad
        maxAge: 24 * 60 * 60 * 1000, // 1 día
      })
      .json({ mensaje: 'Inicio de sesión exitoso', usuario });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Logout protegido usando el token
router.post('/logout', autenticarToken, async (req, res) => {
  const id_usuario = req.usuario.id_usuario; // viene del token

  try {
    await db.execute(`
      UPDATE usuarios
      SET activo = 0
      WHERE id_usuario = ?
    `, [id_usuario]);

    res.json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('Error en logout:', err);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
});


module.exports = router;
