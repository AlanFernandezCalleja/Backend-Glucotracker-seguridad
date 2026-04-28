// middleware/getPermisos.js

const supabase = require('../../database');

// Asegúrate de tener importada tu conexión a Supabase
// const supabase = require('../../database'); 

// Asegúrate de tener importada tu conexión a Supabase
// const supabase = require('../../database'); 

const getPermisos = async (req, res, next) => {
  try {
    // 1. Validación de seguridad básica
    if (!req.usuario || !req.usuario.id_usuario) {
      req.permisos = [];
      return next();
    }

    const id_usuario = req.usuario.id_usuario;

    // 2. Consultamos la tabla, pero ahora pedimos también la columna 'activo' en rol_permiso
    const { data, error } = await supabase
      .from('usuario_rol')
      .select(`
        roles (
          rol_permiso (
            activo,
            permiso (
              nombre
            )
          )
        )
      `)
      .eq('id_usuario', id_usuario);

    if (error) {
      console.error('Error de Supabase consultando roles:', error);
      throw error;
    }

    // 3. Si no trae datos (el usuario no tiene un rol asignado)
    if (!data || data.length === 0) {
      req.permisos = [];
      return next();
    }

    // 4. Extraer y aplanar los permisos
    const permisosExtraidos = [];
    
    data.forEach(ur => {
      if (ur.roles && ur.roles.rol_permiso) {
        ur.roles.rol_permiso.forEach(rp => {
          // 👇 NUEVA VALIDACIÓN: Verificamos explícitamente que el permiso esté activo
          if (rp.activo === true && rp.permiso && rp.permiso.nombre) {
            permisosExtraidos.push(rp.permiso.nombre);
          }
        });
      }
    });

    // 5. Guardamos en la request limpiando posibles duplicados usando Set
    req.permisos = [...new Set(permisosExtraidos)];

    next();
  } catch (error) {
    console.error('Error cargando permisos por rol:', error);
    res.status(500).json({ error: 'Error interno validando los accesos del usuario' });
  }
};


const getPermisosPacientes = async (req, res, next) => {
  try {
    console.log('\n--- 🕵️‍♂️ DEBUG DE PERMISOS ---');
    console.log('1. Datos que vienen del Token:', req.usuario);

    // Validamos que el token realmente traiga el id_usuario
    if (!req.usuario || !req.usuario.id_usuario) {
      console.log('❌ ERROR: El token no tiene "id_usuario"');
      return res.status(401).json({ error: 'Token sin ID de usuario' });
    }

    const id_usuario = req.usuario.id_usuario; 
    console.log('2. Buscando permisos en BD para id_usuario:', id_usuario);

    const { data, error } = await supabase
      .from('usuario_permiso')
      .select(`
        permiso (
          nombre
        )
      `)
      .eq('id_usuario', id_usuario);

    if (error) throw error;

    console.log('3. Respuesta cruda de Supabase:', JSON.stringify(data));

    if (!data || data.length === 0) {
      console.log('⚠️ ADVERTENCIA: Este usuario no tiene NINGÚN permiso en la BD');
      req.permisos = [];
      return next();
    }

    const permisos = data.map(p => p.permiso.nombre);
    console.log('4. Permisos finales en la mochila del usuario:', permisos);
    
    req.permisos = permisos;
    next();
  } catch (error) {
    console.error('Error cargando permisos operativos:', error);
    res.status(500).json({ error: 'Error validando los accesos' });
  }
};

module.exports = {getPermisos,getPermisosPacientes};