const supabase = require('../../database'); // tu cliente Supabase
const bcrypt=require('bcrypt')

const medicosActivos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('medico')
      .select(`
        id:id_medico,
        matricula:matricula_profesional,
        departamento,
        carnet:carnet_profesional,
        usuario!inner (
          nombre_completo,
          fecha_nac,
          telefono:teléfono,
          correo,
          estado
        ),
        administrador (
          usuario (
            nombre_completo
          )
        )
      `)
      .eq('usuario.estado', true);

    if (error) {
      console.error('Error al obtener médicos:', error);
      return res.status(400).json({ error: error.message });
    }

    // Aplanamos el objeto para que coincida exactamente con el retorno de tu función SQL
    const formateado = data.map(m => ({
      id: m.id,
      nombre: m.usuario?.nombre_completo,
      fechaNac: m.usuario?.fecha_nac,
      telefono: m.usuario?.telefono,
      correo: m.usuario?.correo,
      matricula: m.matricula,
      departamento: m.departamento,
      carnet: m.carnet,
      admitidoPor: m.administrador?.usuario?.nombre_completo
    }));

    return res.status(200).json(formateado);

  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};

const medicosSolicitantes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('medico')
      .select(`
        id:id_medico,
        matricula:matricula_profesional,
        departamento,
        carnet:carnet_profesional,
        usuario!inner (
          nombre:nombre_completo,
          fechaNac:fecha_nac,
          telefono:teléfono,
          correo,
          estado
        ),
        administrador (
          usuario (
            nombre:nombre_completo
          )
        )
      `)
      .eq('usuario.estado', false); // 👈 Filtramos por los que NO están activos

    if (error) {
      console.error('Error ejecutando consulta:', error);
      return res.status(400).json({ error: error.message });
    }

    // Aplanamos la estructura para que coincida con el retorno de tu función SQL
    const formateado = data.map(m => ({
      id: m.id,
      nombre: m.usuario?.nombre,
      fechaNac: m.usuario?.fechaNac,
      telefono: m.usuario?.telefono,
      correo: m.usuario?.correo,
      matricula: m.matricula,
      departamento: m.departamento,
      carnet: m.carnet,
      admitidoPor: m.administrador?.usuario?.nombre
    }));

    return res.status(200).json(formateado);

  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};
const activarMedico = async (req, res) => {
  const idMedico = req.params.idMedico;
  const { idAdmin } = req.body;

  if (!idAdmin) {
    return res.status(400).json({ error: 'No hay administrador' });
  }
  console.log('BODY:', req.body);
console.log('PARAMS:', req.params);
  try {
    const { data: medicoData, error: medicoError } = await supabase
      .from('medico')
      .select('id_usuario')
      .eq('id_medico', idMedico)
      .single();

    if (medicoError || !medicoData) {
      return res.status(404).json({ error: 'Médico no encontrado' });
    }

    const idUsuario = medicoData.id_usuario;

    const { error: updateErrorMedico } = await supabase
      .from('medico')
      .update({
        administrador_id_admin: idAdmin
      })
      .eq('id_medico', idMedico);

    if (updateErrorMedico) {
      return res.status(400).json({ error: updateErrorMedico.message });
    }

    const { error: updateErrorUsuario } = await supabase
      .from('usuario')
      .update({ estado: true })
      .eq('id_usuario', idUsuario);

    if (updateErrorUsuario) {
      return res.status(400).json({ error: updateErrorUsuario.message });
    }

    res.json({ mensaje: 'Usuario activado correctamente' });

  } catch (err) {
    res.status(500).json({
      error: 'Error del servidor',
      detalles: err.message
    });
  }
};

// controllers/pacientes.controller.js
const pacientesActivos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('paciente')
      .select(`
        id:id_paciente,
        genero,
        peso,
        altura,
        foto_perfil,
        nombre_emergencia,
        numero_emergencia,
        usuario!inner (
          nombre:nombre_completo,
          correo,
          fechaNac:fecha_nac,
          telefono:teléfono,
          estado,
          usuario_permiso (
            permiso (
              nombre
            )
          )
        ),
        nivel_actividad_fisica (
          descripcion
        ),
        medico (
          usuario (
            nombre_completo
          )
        ),
        administrador (
          usuario (
            nombre_completo
          )
        ),
        paciente_enfermedad (
          enfermedades_base (
            nombre_enfermedad
          )
        ),
        tratamiento_enfermedad (
          tratamientos (
            nombre_tratamiento,
            descripcion
          ),
          dosis
        )
      `)
      .eq('usuario.estado', true); // Filtra solo pacientes con usuario activo

    if (error) {
      console.error('Error al obtener pacientes:', error);
      return res.status(400).json({ error: error.message });
    }

    // Mapeo manual para limpiar la estructura
    const formateado = data.map(p => {
      
      // 👈 EXTRAEMOS LOS PERMISOS EN UN ARREGLO PLANO
      // Quedará algo como: ['registrar_glucosa', 'ver_historial_glucosa']
      const listaPermisos = p.usuario?.usuario_permiso?.map(up => up.permiso?.nombre) || [];

      return {
        id: p.id,
        nombre: p.usuario?.nombre,
        ci: p.usuario?.correo, 
        fechaNac: p.usuario?.fechaNac, 
        genero: p.genero,
        peso: String(p.peso),
        altura: String(p.altura),
        actividadFisica: p.nivel_actividad_fisica?.descripcion,
        telefono: p.usuario?.telefono,
        correo: p.usuario?.correo,
        nombre_emergencia: p.nombre_emergencia,
        numero_emergencia: p.numero_emergencia,
        medico: p.medico?.usuario?.nombre_completo,
        foto_perfil: p.foto_perfil,
        afecciones: p.paciente_enfermedad?.map(pe => ({
          afeccion: pe.enfermedades_base?.nombre_enfermedad
        })) || [],
        tratamientos: p.tratamiento_enfermedad?.map(te => ({
          titulo: te.tratamientos?.nombre_tratamiento,
          desc: te.tratamientos?.descripcion,
          dosis: String(te.dosis)
        })) || [],
        admitidoPor: p.administrador?.usuario?.nombre_completo,
        permisos: listaPermisos // 👈 AGREGAMOS LOS PERMISOS AL JSON
      };
    });

    return res.status(200).json(formateado);

  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};

const pacientesSolicitantes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('paciente')
      .select(`
        id:id_paciente,
        genero,
        peso,
        altura,
        foto_perfil,
        nombre_emergencia,
        numero_emergencia,
        usuario!inner (
          nombre:nombre_completo,
          correo,
          fechaNac:fecha_nac,
          telefono:teléfono,
          estado
        ),
        nivel_actividad_fisica (
          descripcion
        ),
        medico (
          usuario (
            nombre_completo
          )
        ),
        administrador (
          usuario (
            nombre_completo
          )
        ),
        paciente_enfermedad (
          enfermedades_base (
            nombre_enfermedad
          )
        ),
        tratamiento_enfermedad (
          tratamientos (
            nombre_tratamiento,
            descripcion
          ),
          dosis
        )
      `)
      .eq('usuario.estado', false); // Filtra solo pacientes con usuario activo

    if (error) {
      console.error('Error al obtener pacientes:', error);
      return res.status(400).json({ error: error.message });
    }

    // Mapeo manual para limpiar la estructura y que quede idéntica a tu función SQL
    const formateado = data.map(p => ({
      id: p.id,
      nombre: p.usuario?.nombre,
      ci: p.usuario?.correo, // Según tu SQL usas correo como CI
      fechaNac: p.usuario?.fechaNac, 
      genero: p.genero,
      peso: String(p.peso),
      altura: String(p.altura),
      actividadFisica: p.nivel_actividad_fisica?.descripcion,
      telefono: p.usuario?.telefono,
      correo: p.usuario?.correo,
      nombre_emergencia: p.nombre_emergencia,
      numero_emergencia: p.numero_emergencia,
      medico: p.medico?.usuario?.nombre_completo,
      foto_perfil: p.foto_perfil,
      afecciones: p.paciente_enfermedad?.map(pe => ({
        afeccion: pe.enfermedades_base?.nombre_enfermedad
      })) || [],
      tratamientos: p.tratamiento_enfermedad?.map(te => ({
        titulo: te.tratamientos?.nombre_tratamiento,
        desc: te.tratamientos?.descripcion,
        dosis: String(te.dosis)
      })) || [],
      admitidoPor: p.administrador?.usuario?.nombre_completo
    }));

    return res.status(200).json(formateado);

  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};



const activarPaciente= async (req, res) => {
  const idPaciente = req.params.idPaciente;
    const { idAdmin } = req.body;
    if (!idAdmin) {
    return res.status(400).json({ error: 'No hay administrador' });
  }
  try {
    // 1. Obtener id_usuario desde medico
    const { data: pacienteData, error: pacienteError } = await supabase
      .from('paciente')
      .select('id_usuario')
      .eq('id_paciente', idPaciente)
      .single();

    if (pacienteError) {
      return res.status(400).json({ error: medicoError.message });
    }

    if (!pacienteData) {
      return res.status(404).json({ error: 'Medico no encontrado' });
    }

    const idUsuario = pacienteData.id_usuario;
    const { error: updateErrorPaciente } = await supabase
      .from('paciente')
      .update({
        administrador_id_admin: idAdmin
      })
      .eq('id_paciente', idPaciente);

    if (updateErrorPaciente) {
      return res.status(400).json({ error: updateErrorPaciente.message });
    }
    // 2. Actualizar estado del usuario
    const { data: updateData, error: updateError } = await supabase
      .from('usuario')
      .update({ estado: true })
      .eq('id_usuario', idUsuario);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ mensaje: 'Usuario activado correctamente', usuario: updateData });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor', detalles: err.message });
  }
};


const perfilAdmin= async (req, res) => {
  try {
    const idUsuario = parseInt(req.params.idUsuario);

    const { data, error } = await supabase.rpc('obtener_admin_por_usuario', {
      id_usuario_input: idUsuario
    });

    if (error) {
      console.error('Error ejecutando función:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontró el administrador' });
    }

    return res.status(200).json(data[0]); // devuelve el objeto directamente
  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};


const agregarAdmin = async (req, res) => {
  // 1. Ya no recibimos 'cargo' del frontend
  const {
    nombre,
    correo,
    contrasena,
    fechaNacimiento,
    telefono,
    fecha_registro,
    administrador_id_admin
  } = req.body;

  if (!nombre || !correo || !contrasena || !fechaNacimiento || !fecha_registro || !telefono || !administrador_id_admin) {
    return res.status(400).json({ error: 'Todos los campos deben ser llenados' });
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);
    
    // 2. Establecemos el cargo de forma estricta en el backend
    const cargoFijo = 'soporte';

    // 3. Insertamos en la tabla usuario
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuario')
      .insert([
        {
          nombre_completo: nombre,
          correo: correo,
          contrasena: hashedPassword,
          rol: cargoFijo, // Actualizamos la etiqueta estática del usuario
          fecha_nac: fechaNacimiento,
          teléfono: telefono,
          estado: true, // Asumimos que el OSI lo activa inmediatamente al crearlo
        },
      ])
      .select();

    if (usuarioError) throw usuarioError;
    const usuario_insertado = usuarioData[0];

    // 4. Insertamos en la tabla administrador
    const { data: adminData, error: adminError } = await supabase
      .from("administrador")
      .insert([
        {
          id_usuario: usuario_insertado.id_usuario,
          cargo: cargoFijo,
          fecha_ingreso: fecha_registro,
          administrador_id_admin: administrador_id_admin
        }
      ])
      .select();

    if (adminError) throw adminError;

    // 5. NUEVO: Lógica de relación con RBAC
    // Buscamos el ID dinámico del rol "Soporte" en la BD (ilike ignora mayúsculas/minúsculas)
    const { data: rolData, error: rolError } = await supabase
      .from('roles')
      .select('id_rol')
      .ilike('nombre_rol', 'soporte')
      .single();

    if (rolError) {
      console.error('Error buscando el rol Soporte:', rolError);
      throw new Error('No se encontró el rol de soporte en el catálogo del sistema.');
    }

    // Insertamos la relación en la tabla puente
    const { error: usuRolError } = await supabase
      .from('usuario_rol')
      .insert([
        {
          id_usuario: usuario_insertado.id_usuario,
          id_rol: rolData.id_rol
        }
      ]);

    if (usuRolError) throw usuRolError;

    res.status(200).json({
      message: 'Personal de soporte registrado y asignado a su rol correctamente',
      usuario_insertado,
      adminData
    });

  } catch (error) {
    console.error("Error al insertar los datos: ", error.message);
    res.status(500).json({ error: error.message });
  }
};

const obtenerAdmins = async (req, res) => {
  try {
    // 1. Recibimos el código público desde la URL
    const { idAdmin } = req.params;

    if (!idAdmin) {
      return res.status(400).json({ error: "El código de usuario es requerido" });
    }

    // 2. Ejecutamos 1 sola consulta emulando los JOINs
    const { data, error } = await supabase
  .from('administrador')
  .select(`
    id_admin,
    cargo,
    fecha_ingreso,
    usuario!inner (
      nombre_completo,
      correo,
      fecha_nac,
      teléfono
    ),
    administrador (
      usuario (
        nombre_completo
      )
    ),
    admin_permiso (
      permiso (
        nombre
      )
    )
  `)
  .neq('id_admin', 1)
  .neq('usuario.id_usuario', idAdmin); // 👈 ¡LA MEJORA! Excluye al solicitante directamente usando el código de la tabla usuario

    if (error) {
      console.error('Error obteniendo admins visibles:', error);
      return res.status(500).json({ error: error.message });
    }

    // 3. Mapeamos (aplanamos) los resultados para Angular
   const adminsFormateados = data.map((a) => {

  let nombreAdmin = null;
  if (a.administrador && a.administrador.usuario) {
    nombreAdmin = a.administrador.usuario.nombre_completo;
  }

  // 🧠 convertir lista de permisos a objeto booleano
  const permisos = {
    editar: false,
    eliminar: false,
    ver: false,
    agregar: false
  };

  if (a.admin_permiso) {
    a.admin_permiso.forEach(p => {
      const nombre = p.permiso.nombre;

      if (nombre === 'EDITAR_ADMIN') permisos.editar = true;
      if (nombre === 'ELIMINAR_ADMIN') permisos.eliminar = true;
      if (nombre === 'VER_ADMIN') permisos.ver = true;
      if (nombre === 'AGREGAR_ADMIN') permisos.agregar = true;
    });
  }

  return {
    id: a.id_admin,
    nombre: a.usuario.nombre_completo,
    correo: a.usuario.correo,
    fechaNac: a.usuario.fecha_nac,
    telefono: a.usuario.teléfono,
    cargo: a.cargo,
    fechaIn: a.fecha_ingreso,
    admitidoPor: nombreAdmin,
    permisos // 👈 🔥 AHORA VIENE DESDE BD
  };
});

    // 4. Devolvemos el JSON limpio
    return res.status(200).json(adminsFormateados);

  } catch (err) {
    console.error('Error interno en obtenerAdminsVisibles:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};

const actualizarPermisosAdmins = async (req, res) => {
  try {
    const admins = req.body;

    for (const admin of admins) {
      const id_admin = admin.id;

      // 1. Obtener permisos actuales
      const { data: actuales, error } = await supabase
        .from('admin_permiso')
        .select('id_permiso')
        .eq('id_admin', id_admin);

      if (error) throw error;

      const actualesIds = actuales.map(p => p.id_permiso);

      // 2. Convertir permisos nuevos a IDs
      const nuevosIds = [];

      if (admin.permisos.editar) nuevosIds.push(1);
      if (admin.permisos.eliminar) nuevosIds.push(2);
      if (admin.permisos.ver) nuevosIds.push(3);
      if (admin.permisos.agregar) nuevosIds.push(4);

      // 3. Calcular diferencias
      const aInsertar = nuevosIds.filter(id => !actualesIds.includes(id));
      const aEliminar = actualesIds.filter(id => !nuevosIds.includes(id));

      // 4. Insertar nuevos
      if (aInsertar.length > 0) {
        const nuevosPermisos = aInsertar.map(id_permiso => ({
          id_admin,
          id_permiso
        }));

        await supabase
          .from('admin_permiso')
          .insert(nuevosPermisos);
      }

      // 5. Eliminar los que ya no están
      if (aEliminar.length > 0) {
        await supabase
          .from('admin_permiso')
          .delete()
          .eq('id_admin', id_admin)
          .in('id_permiso', aEliminar);
      }
    }

    res.json({ mensaje: 'Permisos actualizados inteligentemente ' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error actualizando permisos' });
  }
};

const obtenerRoles = async (req, res) => {
  try {
    const { data: roles, error } = await supabase
      .from("roles")
      .select("*");

    // ❌ error en la consulta
    if (error) {
      return response(res, "error", 500, "Error al consultar roles", null);
    }

    // ✅ éxito pero sin datos
    if (!roles || roles.length === 0) {
      return response(res, "success", 200, "No se encontraron roles", []);
    }

    // ✅ éxito con datos
    return response(res, "success", 200, "Roles obtenidos correctamente", roles);

  } catch (err) {
    console.error(err);
    return response(res, "error", 500, "Error interno del servidor", null);
  }
};



const insertarRoles = async (req, res) => {
  const { nombre_rol } = req.body;
  if (!nombre_rol) {
    return response(res, "error", 400, "El nombre del nuevo rol es requerido", null);
  }
  if (nombre_rol.length < 5) {
    return response(res, "error", 400, "El nombre del nuevo rol debe tener más de 4 caracteres", null);
  }
  try {
    const { data, error } = await supabase
      .from("roles")
      .insert([{ nombre_rol }])
      .select(); 
    if (error) {
      return response(res, "error", 500, "Error al insertar el rol", null);
    }
    return response(res, "success", 201, "Rol creado correctamente", data);
  } catch (err) {
    console.error(err);
    return response(res, "error", 500, "Error interno del servidor", null);
  }
};

const response = (res, status, code, message, data = null) => {
  return res.status(code).json({
    status,
    code,
    message,
    data
  });
};


// controlador de permisos
const actualizarPermisosPacientes = async (req, res) => {
  try {
    const { correo, permisos_activos } = req.body;

    // Validación básica
    if (!correo || !Array.isArray(permisos_activos)) {
      return res.status(400).json({ error: 'Faltan datos o formato incorrecto' });
    }

    // 1. Buscar el id_usuario usando el correo estandarizado
    const { data: usuario, error: errUsu } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('correo', correo)
      .single();

    if (errUsu || !usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const idUsuario = usuario.id_usuario;

    // 2. Buscar los IDs numéricos de los permisos enviados
    let permisosInsertar = [];
    
    if (permisos_activos.length > 0) {
      const { data: listaPermisos, error: errPerm } = await supabase
        .from('permiso')
        .select('id_permiso, nombre')
        .in('nombre', permisos_activos); // Busca todos los nombres de golpe

      if (errPerm) throw new Error('Error buscando el catálogo de permisos');

      // Armamos el arreglo listo para insertar en la tabla pivote
      permisosInsertar = listaPermisos.map(p => ({
        id_usuario: idUsuario,
        id_permiso: p.id_permiso
      }));
    }

    // 3. Borrar todos los permisos anteriores (Limpiar la pizarra)
    const { error: errDel } = await supabase
      .from('usuario_permiso')
      .delete()
      .eq('id_usuario', idUsuario);

    if (errDel) throw new Error('Error limpiando permisos anteriores');

    // 4. Insertar los nuevos permisos (si es que dejó alguno marcado)
    if (permisosInsertar.length > 0) {
      const { error: errIns } = await supabase
        .from('usuario_permiso')
        .insert(permisosInsertar);

      if (errIns) throw new Error('Error asignando los nuevos permisos');
    }

    // Respuesta de éxito
    return res.status(200).json({ mensaje: 'Permisos actualizados correctamente' });

  } catch (err) {
    console.error('Error al actualizar permisos:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
const obtenerRolesPermisos = async (req, res) => {
  try {
    // 1. Obtenemos primero el catálogo maestro de todos los permisos del sistema
    const { data: todosLosPermisos, error: errP } = await supabase
  .from('permiso')
  .select('id_permiso, nombre')
  .gt('id_permiso', 4); // 👈 excluye 1–4
    if (errP) throw errP;

    // 2. Consultamos los roles (excluyendo administrador) y sus relaciones actuales
    const { data: rolesData, error: errR } = await supabase
      .from('roles')
      .select(`
        id_rol,
        nombre_rol,
        rol_permiso (
          id_permiso,
          activo
        )
      `)
      .neq('nombre_rol', 'administrador')
      .order('id_rol', { ascending: true });

    if (errR) throw errR;

    // 3. Cruzamos los datos para devolver la matriz completa (true/false)
    const rolesFormateados = rolesData.map(rol => {
      
      const matrizPermisos = todosLosPermisos.map(p => {
        // Buscamos si existe el registro en la tabla puente rol_permiso
        const relacion = rol.rol_permiso.find(rp => rp.id_permiso === p.id_permiso);
        
        return {
          id_permiso: p.id_permiso,
          nombre: p.nombre,
          // Si el registro existe, usamos su valor real. Si no existe, es false por defecto.
          activo: relacion ? relacion.activo : false
        };
      });

      return {
        id_rol: rol.id_rol,
        nombre_rol: rol.nombre_rol,
        permisos: matrizPermisos
      };
    });

    return res.status(200).json(rolesFormateados);

  } catch (error) {
    console.error('Error en obtenerRolesPermisos:', error);
    return res.status(500).json({ error: 'Error al cargar la matriz de accesos' });
  }
};

const actualizarMatrizRoles = async (req, res) => {
  try {
    const rolesModificados = req.body; // Recibe el arreglo de roles que tuvieron cambios

    if (!Array.isArray(rolesModificados) || rolesModificados.length === 0) {
      return res.status(400).json({ error: 'No se recibieron cambios válidos para actualizar' });
    }

    // 1. Aplanamos la estructura jerárquica para que encaje exacto con las columnas de tu BD
    const dataParaUpsert = [];

    rolesModificados.forEach(rol => {
      if (rol.permisos && Array.isArray(rol.permisos)) {
        rol.permisos.forEach(permiso => {
          dataParaUpsert.push({
            id_rol: rol.id_rol,
            id_permiso: permiso.id_permiso,
            activo: permiso.activo
          });
        });
      }
    });

    // Validamos que después de aplanar realmente haya datos
    if (dataParaUpsert.length === 0) {
      return res.status(400).json({ error: 'La estructura de permisos estaba vacía.' });
    }

    // 2. Ejecutamos el upsert masivo en Supabase.
    // Si la tupla (id_rol, id_permiso) ya existe, actualiza 'activo'. Si no, crea la fila.
    const { error } = await supabase
      .from('rol_permiso')
      .upsert(dataParaUpsert, { onConflict: 'id_rol, id_permiso' });

    if (error) {
      console.error('Error en Supabase guardando el delta de permisos:', error);
      throw error;
    }

    return res.status(200).json({ message: 'Matriz de accesos actualizada con éxito' });

  } catch (error) {
    console.error('Error en actualizarMatrizRoles:', error);
    return res.status(500).json({ error: 'Error interno al procesar la actualización' });
  }
};



module.exports={medicosActivos,medicosSolicitantes,activarMedico,pacientesActivos,pacientesSolicitantes,
  activarPaciente,perfilAdmin,agregarAdmin,obtenerAdmins, actualizarPermisosAdmins, obtenerRoles,insertarRoles,
   actualizarPermisosPacientes,obtenerRolesPermisos,actualizarMatrizRoles};