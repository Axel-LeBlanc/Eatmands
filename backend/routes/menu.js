const express = require('express');
const router = express.Router();
const db = require('../db');

//Mostrar menú (exclusivo para clientes)
router.get('/', async (req, res) => {
  try {
    const [productos] = await db.execute(`
      SELECT 
        id_producto, 
        nombre, 
        descripcion, 
        precio,
        descuento,
        descuento_activo,
        (precio - IF(descuento_activo, descuento, 0)) AS precio_final
      FROM productos 
      WHERE disponible = 1
    `);

    res.json(productos.map(p => ({
      id_producto: p.id_producto,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio_original: p.precio,
      descuento: p.descuento_activo ? p.descuento : 0,
      precio_final: p.precio_final
    })));
  } catch (err) {
    console.error('Error al obtener menú:', err);
    res.status(500).json({ error: 'Error al obtener el menú' });
  }
});

module.exports = router;