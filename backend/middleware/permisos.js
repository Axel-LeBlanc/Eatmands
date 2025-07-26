function verificarPermiso(rolesPermitidos) {
  return (req, res, next) => {
    const usuario = req.usuario;

    if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
      return res.status(403).json({ error: 'Acceso denegado: permiso insuficiente' });
    }

    next();
  };
}

module.exports = verificarPermiso;
