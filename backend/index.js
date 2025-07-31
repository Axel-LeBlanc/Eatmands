const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Rutas
const usuariosRoutes = require('./routes/usuarios');
app.use('/api/usuarios', usuariosRoutes);

const rolesRoutes = require('./routes/roles');
app.use('/api/roles', rolesRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const productosRoutes = require('./routes/productos');
app.use('/api/productos', productosRoutes);

const menuRoutes = require('./routes/menu');
app.use('/api/menu', menuRoutes);

const categoriasRoutes = require('./routes/categorias');
app.use('/api/categorias', categoriasRoutes);

const pedidosRoutes = require('./routes/pedidos');
app.use('/api/pedidos', pedidosRoutes);

const detallePedidoRoutes = require('./routes/detalle_pedido');
app.use('/api/detalle_pedido', detallePedidoRoutes);

const filtroPedidoRouter = require('./routes/filtro_pedido');
app.use('/pedidos/filtro', filtroPedidoRouter);


// Servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});
