// middleware/getPermisos.js

const supabase = require('../../database');

const getPermisos = async (req, res, next) => {
  try {
    const id_usuario = req.usuario.id_usuario;

    const { data, error } = await supabase
      .from('administrador')
      .select(`
        id_admin,
        admin_permiso (
          permiso (
            nombre
          )
        )
      `)
      .eq('id_usuario', id_usuario)
      .maybeSingle();

    if (error) throw error;

    // Si no es admin → no tiene permisos
    if (!data) {
      req.permisos = [];
      return next();
    }

    // Extraer nombres de permisos
    const permisos = data.admin_permiso.map(p => p.permiso.nombre);

    req.permisos = permisos;

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error cargando permisos' });
  }
};

module.exports = getPermisos;