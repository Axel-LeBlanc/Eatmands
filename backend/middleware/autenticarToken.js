// Este middleware autentica el token JWT y lo agrega al objeto de solicitud
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

function autenticarToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token requerido' });

  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });

    req.usuario = usuario; // <-- se usa en verificarPermiso
    next();
  });
}

module.exports = autenticarToken;
