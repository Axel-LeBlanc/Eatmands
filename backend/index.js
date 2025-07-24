const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const usuariosRoutes = require('./routes/usuarios');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json()); // 👈 Esto permite parsear JSON
app.use('/api/usuarios', usuariosRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});
