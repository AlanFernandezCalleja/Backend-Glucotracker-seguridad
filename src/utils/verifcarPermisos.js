// middleware/verificarPermiso.js

const verificarPermiso = (permisoRequerido) => {
  return (req, res, next) => {
    if (!req.permisos.includes(permisoRequerido)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }
    next();
  };
};

module.exports = verificarPermiso;