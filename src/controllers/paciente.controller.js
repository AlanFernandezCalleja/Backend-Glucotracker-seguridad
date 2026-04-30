const supabase = require('../../database'); // tu cliente Supabase
const bcrypt=require('bcrypt')
const response = (res, status, code, message, data = null) => {
  return res.status(code).json({
    status,
    code,
    message,
    data
  });
};

/*
const registrarPaciente = async (req, res) => {
  try {
    console.log("FILES LLEGAN:", req.files);
    console.log("BODY LLEGA:", req.body);

    const {
      nombre_completo,
      correo,
      contrasena,
      rol,
      fecha_nac,
      id_medico,
      id_actividad,
      genero,
      peso,
      altura,
      enfermedad_id,
      tratamiento_id,
      dosis_,
      nombre_emergencia,
      numero_emergencia,
      embarazada,
      semanas
    } = req.body;

    const teléfono = req.body["teléfono"] || req.body["telÃ©fono"];
    const imgFiles = req.files?.foto_perfil;

    if (!imgFiles || imgFiles.length === 0) {
      return response(res)res.status(400).json({ error: "Archivo de perfil faltante" });
    }

    const img = imgFiles[0];
    const imgUpload = await supabase.storage
      .from("perfiles_pacientes")
      .upload(`imgs/${Date.now()}_${img.originalname}`, img.buffer, { contentType: img.mimetype });

    if (imgUpload.error) throw imgUpload.error;
    const imgUrl = supabase.storage.from("perfiles_pacientes").getPublicUrl(imgUpload.data.path).data.publicUrl;

    // Validación de campos obligatorios
    if (!nombre_completo || !correo || !contrasena || !rol || !fecha_nac || !teléfono || !id_medico
        || !id_actividad || !genero || !peso || !altura || !enfermedad_id || !tratamiento_id
        || !dosis_ || !nombre_emergencia || !numero_emergencia || !imgUrl) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben ser llenados' });
    }

    // Conversión de tipos
    const id_medicoInt = parseInt(id_medico);
    const id_actividadInt = parseInt(id_actividad);
    const enfermedad_idInt = parseInt(enfermedad_id);
    const tratamiento_idInt = parseInt(tratamiento_id);
    const pesoNum = parseFloat(peso);
    const alturaNum = parseFloat(altura);
    const embarazadaBool = embarazada === 'true' || embarazada === true;
    const semanasInt = semanas ? parseInt(semanas) : null;

    // Hash de contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    // Insert usuario
    const { data: usuarioInsertadoData, error: usuarioInsertadoError } = await supabase
      .from("usuario")
      .insert([{
        nombre_completo,
        correo,
        contrasena: hashedPassword,
        rol,
        fecha_nac,
        teléfono
      }]).select();

    if (usuarioInsertadoError) throw usuarioInsertadoError;

    const usuario_insertado = usuarioInsertadoData[0];

    // Insert paciente
    const { data: pacienteData, error: pacienteError } = await supabase
      .from("paciente")
      .insert([{
        id_usuario: usuario_insertado.id_usuario,
        id_medico: id_medicoInt,
        id_nivel_actividad: id_actividadInt,
        genero,
        peso: pesoNum,
        altura: alturaNum,
        embarazo: embarazadaBool,
        nombre_emergencia,
        numero_emergencia,
        foto_perfil: imgUrl
      }]).select();

    if (pacienteError) throw pacienteError;

    const paciente = pacienteData[0];

    // Seguimiento embarazo solo si aplica
    if (embarazadaBool && semanasInt !== null) {
      await supabase.from('seguimiento_embarazo').insert({
        id_paciente: paciente.id_paciente,
        fecha_registro: usuario_insertado.fecha_registro,
        semanas_embarazo: semanasInt
      });
    }

    // Insert tratamiento
    const { data: dataTratamiento, error: errorTratamiento } = await supabase
      .from('tratamiento_enfermedad')
      .insert({
        id_paciente: paciente.id_paciente,
        id_tratamiento: tratamiento_idInt,
        dosis: dosis_
      });

    if (errorTratamiento) throw errorTratamiento;

    // Insert enfermedad
    const { data: dataEnfermedad, error: errorEnfermedad } = await supabase
      .from('paciente_enfermedad')
      .insert({
        id_paciente: paciente.id_paciente,
        id_enfermedad: enfermedad_idInt
      });
    
    const { data: existing } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('correo', correo)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
}

    if (errorEnfermedad) throw errorEnfermedad;

    res.status(200).json({
      message: 'Usuario y paciente registrados correctamente',
      usuario_insertado,
      paciente
    });

  } catch (error) {
    console.error("Error al insertar datos: ", error);
    res.status(500).json({ error: error.message });
  }
};
*/

const perfilPaciente = async (req, res) => {
  try {
    const idPaciente = parseInt(req.params.idPaciente);

    // 1️⃣ Validación básica
    if (isNaN(idPaciente)) {
      return response(res, 'error', 400, 'El ID del paciente proporcionado no es válido');
    }

    // 2️⃣ Consulta relacional con Supabase (Reemplazo del RPC)
    const { data: p, error } = await supabase
      .from('paciente')
      .select(`
        id_paciente,
        genero,
        altura,
        peso,
        embarazo,
        nombre_emergencia,
        numero_emergencia,
        foto_perfil,
        usuario!inner (
          id_usuario,
          nombre_completo,
          fecha_nac,
          teléfono,
          correo,
          fecha_registro
        ),
        nivel_actividad_fisica ( descripcion ),
        administrador ( usuario ( nombre_completo ) ),
        medico ( usuario ( nombre_completo ) ),
        paciente_enfermedad ( enfermedades_base ( nombre_enfermedad ) ),
        tratamiento_enfermedad ( dosis, tratamientos ( nombre_tratamiento, descripcion ) ),
        seguimiento_embarazo ( semanas_embarazo, fecha_registro, fecha_terminacion )
      `)
      .eq('id_paciente', idPaciente)
      .single(); // Esperamos un solo paciente

    if (error) {
      console.error('Error en consulta Supabase (perfilPaciente):', error.message);
      if (error.code === 'PGRST116') {
        return response(res, 'error', 404, 'No se encontró el paciente solicitado');
      }
      throw error;
    }

    // 3️⃣ Lógica para el seguimiento de embarazo (Replicando el CASE y ORDER BY del SQL)
    let semanas_embarazo = null;
    let registro_embarazo = null;

    if (p.embarazo && p.seguimiento_embarazo && p.seguimiento_embarazo.length > 0) {
      // Ordenamos en memoria: primero los activos (fecha_terminacion nula), luego por fecha más reciente
      const embarazosOrdenados = [...p.seguimiento_embarazo].sort((a, b) => {
        const aActivo = a.fecha_terminacion === null ? 0 : 1;
        const bActivo = b.fecha_terminacion === null ? 0 : 1;
        
        if (aActivo !== bActivo) return aActivo - bActivo;
        // Si ambos están activos o inactivos, ordenamos por fecha_registro descendente
        return new Date(b.fecha_registro) - new Date(a.fecha_registro);
      });

      semanas_embarazo = embarazosOrdenados[0].semanas_embarazo;
      registro_embarazo = embarazosOrdenados[0].fecha_registro;
    }

    // 4️⃣ Formateo de fecha de nacimiento (Replicando to_char 'DD/MM/YYYY')
    let fechaNacFormateada = null;
    if (p.usuario?.fecha_nac) {
      const [year, month, day] = p.usuario.fecha_nac.split('-');
      fechaNacFormateada = `${day}/${month}/${year}`;
    }

    // 5️⃣ Construcción del JSON final (Replicando la estructura exacta de json_build_object)
    const pacienteFormateado = {
      nombre: p.usuario?.nombre_completo,
      id: String(p.usuario?.id_usuario), // Cast a texto como en tu SQL
      fechaNac: fechaNacFormateada,
      genero: p.genero,
      altura: p.altura,
      peso: p.peso,
      telefono: p.usuario?.teléfono,
      correo: p.usuario?.correo,
      embarazo: p.embarazo,
      semanas_embarazo: semanas_embarazo,
      registro_embarazo: registro_embarazo,
      nombre_emergencia: p.nombre_emergencia,
      numero_emergencia: p.numero_emergencia,
      foto_perfil: p.foto_perfil,
      nombre_medico: p.medico?.usuario?.nombre_completo || null,
      fecha_registro: p.usuario?.fecha_registro,
      actividadFisica: {
        nivel: p.nivel_actividad_fisica?.descripcion || null,
        descripcion: p.nivel_actividad_fisica?.descripcion || null
      },
      afecciones: p.paciente_enfermedad?.map(pe => pe.enfermedades_base?.nombre_enfermedad) || [],
      tratamientos: p.tratamiento_enfermedad?.map(te => ({
        titulo: te.tratamientos?.nombre_tratamiento,
        descripcion: te.tratamientos?.descripcion,
        dosis: String(te.dosis)
      })) || [],
      admitidoPor: p.administrador?.usuario?.nombre_completo || null
    };

    // 6️⃣ Respuesta exitosa estandarizada
    return response(res, 'success', 200, 'Perfil de paciente obtenido correctamente', pacienteFormateado);

  } catch (err) {
    console.error('Error interno en perfilPaciente:', err);
    return response(res, 'error', 500, 'Error interno del servidor al procesar el perfil del paciente');
  }
};


const registrosPaciente = async (req, res) => {
  try {
    const idPaciente = parseInt(req.params.idPaciente);

    // 1️⃣ Validación de entrada
    if (isNaN(idPaciente)) {
      return response(res, 'error', 400, 'El ID del paciente proporcionado no es válido');
    }

    // 2️⃣ Consulta Supabase replicando los LEFT JOINs
    const { data: registrosBD, error } = await supabase
      .from('registro_glucosa')
      .select(`
        id_registro,
        fecha,
        hora,
        nivel_glucosa,
        observaciones,
        momento_dia ( momento ),
        medico ( 
          usuario ( nombre_completo ) 
        ),
        alertas (
          id_alerta,
          tipo_alerta ( tipo ),
          retroalimentacion ( mensaje )
        )
      `)
      .eq('id_paciente', idPaciente)
      .order('fecha', { ascending: false }) // ORDER BY rg.fecha DESC
      .order('hora', { ascending: false }); // ORDER BY rg.hora DESC

    if (error) {
      console.error('Error en consulta Supabase (registrosPaciente):', error.message);
      throw error;
    }

    // 3️⃣ Si no hay registros, devolvemos arreglo vacío exitosamente
    if (!registrosBD || registrosBD.length === 0) {
      return response(res, 'success', 200, 'El paciente no tiene registros de glucosa', []);
    }

    // 4️⃣ Mapeo a la estructura plana exacta que devolvía tu SQL
    const registrosFormateados = registrosBD.map(rg => {
      // Supabase devuelve las relaciones 1 a N (como alertas) en un arreglo.
      // Tomamos la primera alerta (si existe) y su respectiva retroalimentación.
      const alerta = (rg.alertas && rg.alertas.length > 0) ? rg.alertas[0] : null;
      const retroalimentacion = (alerta && alerta.retroalimentacion && alerta.retroalimentacion.length > 0) 
                                ? alerta.retroalimentacion[0] 
                                : null;

      return {
        id: rg.id_registro,
        fecha: rg.fecha,
        hora: rg.hora,
        nivelGlucosa: Number(rg.nivel_glucosa),
        momentoDia: rg.momento_dia?.momento || null,
        quienTomoMuestra: rg.medico?.usuario?.nombre_completo || null,
        observaciones: rg.observaciones || null,
        idAlerta: alerta?.id_alerta || null,
        tipo_alerta: alerta?.tipo_alerta?.tipo || null,
        respuesta: retroalimentacion?.mensaje || null
      };
    });

    // 5️⃣ Respuesta exitosa estandarizada
    return response(res, 'success', 200, 'Historial de glucosa obtenido correctamente', registrosFormateados);

  } catch (err) {
    console.error('Error interno en registrosPaciente:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar los registros de glucosa');
  }
};



const registrarGlucosa = async (req, res) => {
  const {
    fecha,
    hora,
  
    id_momento,
    id_paciente,
    nivel_glucosa,
    observaciones
  } = req.body;

  if (!fecha || !hora  || !id_momento || !id_paciente || !nivel_glucosa) {
    return res.status(400).json({ error: "Todos los campos (menos observaciones) deben estar llenados" });
  }

  try {
    const { data: glucosaData, error: glucosaError } = await supabase
      .from("registro_glucosa")
      .insert([
        {
          id_paciente,
         
          id_momento,
          fecha,
          hora,
          nivel_glucosa,
          observaciones
        }
      ])
      .select(); // devuelve el registro insertado

    if (glucosaError) throw glucosaError;

    const registro_glucosa = glucosaData[0]; // el primer registro insertado

    // Retornar el ID generado
    res.status(200).json({
      message: "Registro insertado correctamente",
      id_registro: registro_glucosa.id, // ⚠️ asumimos que la columna PK es "id"
      registro_glucosa
    });

  } catch (error) {
    console.error("Error al insertar los datos: ", error.message);
    res.status(500).json({ error: error.message });
  }
};





const actualizarPaciente = async (req, res) => {
  const id_usuario = parseInt(req.params.id_usuario);
  const {
    nombre,
    altura,
    peso,
    telefono,
    correo,
    embarazo,
    fecha_terminacion,
    semanas_embarazo,
    nombre_emergencia,
    numero_emergencia
  } = req.body;

  if (!nombre || altura == null || !peso || !telefono || !correo || !nombre_emergencia || !numero_emergencia) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    // Obtener id_paciente desde id_usuario
    const { data: pacienteData, error: pacienteError } = await supabase
      .from('paciente')
      .select('id_paciente')
      .eq('id_usuario', id_usuario)
      .single();

    if (pacienteError) throw pacienteError;
    if (!pacienteData) return res.status(404).json({ error: 'Paciente no encontrado' });

    const id_paciente = pacienteData.id_paciente;

    // Actualizamos tabla usuario
    const { data: usuarioActualizado, error: errorUsuario } = await supabase
      .from('usuario')
      .update({
        nombre_completo: nombre,
        correo,
        teléfono: telefono
      })
      .eq('id_usuario', id_usuario)
      .select()
      .single();

    if (errorUsuario) throw errorUsuario;

    // Actualizamos tabla paciente
    const { data: pacienteActualizado, error: errorPaciente } = await supabase
      .from('paciente')
      .update({
        altura,
        peso: parseFloat(peso),
        embarazo: embarazo !== undefined ? embarazo : undefined,
        nombre_emergencia,
        numero_emergencia
      })
      .eq('id_usuario', id_usuario)
      .select()
      .single(); // ⬅️ usar single() para tener un objeto y no array

    if (errorPaciente) throw errorPaciente;

    // Manejo de seguimiento_embarazo
    if (embarazo === true && semanas_embarazo > 0) {
      // Insertar nuevo seguimiento
      const { error: errorSeguimiento } = await supabase
        .from('seguimiento_embarazo')
        .insert({
          id_paciente,
          fecha_registro: new Date().toISOString().split('T')[0],
          semanas_embarazo,
          fecha_terminacion: null
        });
      if (errorSeguimiento) throw errorSeguimiento;
    } else if (embarazo === false && fecha_terminacion) {
      // Obtener el seguimiento más reciente activo
      const { data: seguimientosActivos, error: errorFetch } = await supabase
        .from('seguimiento_embarazo')
        .select('id_seguimiento')
        .eq('id_paciente', id_paciente)
        .is('fecha_terminacion', null)
        .order('fecha_registro', { ascending: false })
        .limit(1);

      if (errorFetch) throw errorFetch;

      if (seguimientosActivos && seguimientosActivos.length > 0) {
        const id_seguimiento = seguimientosActivos[0].id_seguimiento;
        const { error: errorUpdate } = await supabase
          .from('seguimiento_embarazo')
          .update({ fecha_terminacion })
          .eq('id_seguimiento', id_seguimiento);

        if (errorUpdate) throw errorUpdate;
      }
    }

    res.json({
      usuario: usuarioActualizado,
      paciente: pacienteActualizado
    });

  } catch (error) {
    console.error("Error al actualizar paciente:", error);
    res.status(500).json({ error: 'Error al actualizar paciente', details: error });
  }
};

const obtenerSemanasEmbarazoActual = async (req, res) => {
  const id_paciente = parseInt(req.params.id_paciente);

  // 1️⃣ Validación básica
  if (isNaN(id_paciente)) {
    return response(res, 'error', 400, 'El ID del paciente proporcionado no es válido');
  }

  try {
    // 2️⃣ Obtener si el paciente está embarazado
    const { data: dataPaciente, error: errorPaciente } = await supabase
      .from("paciente")
      .select("embarazo")
      .eq("id_paciente", id_paciente)
      .single();

    if (errorPaciente) {
      // Supabase lanza 'PGRST116' cuando el .single() no encuentra nada
      if (errorPaciente.code === 'PGRST116') {
        return response(res, 'error', 404, 'Paciente no encontrado en el sistema');
      }
      throw errorPaciente;
    }

    const embarazo = dataPaciente.embarazo;

    // 3️⃣ Si NO está embarazado
    if (embarazo !== true) {
      return response(res, 'success', 200, 'El paciente no se encuentra en estado de gestación', { 
        semanas_actuales: null 
      });
    }

    // 4️⃣ Si SÍ está embarazado, obtener el último registro activo
    const { data: dataEmbarazo, error: errorEmbarazo } = await supabase
      .from("seguimiento_embarazo")
      .select("fecha_registro, semanas_embarazo")
      .eq("id_paciente", id_paciente)
      .is("fecha_terminacion", null)
      .order("fecha_registro", { ascending: false })
      .limit(1);

    if (errorEmbarazo) throw errorEmbarazo;

    if (!dataEmbarazo || dataEmbarazo.length === 0) {
      // Es un paciente con estado embarazo=true, pero sin registros activos (quizás faltó crearlo)
      return response(res, 'success', 200, 'No hay un seguimiento de embarazo activo registrado', { 
        semanas_actuales: null 
      });
    }

    // 5️⃣ Cálculo de las semanas actuales
    const registro = dataEmbarazo[0];
    const fechaRegistro = new Date(registro.fecha_registro);
    const semanasIniciales = registro.semanas_embarazo;

    const hoy = new Date();
    const diferenciaDias = Math.floor((hoy - fechaRegistro) / (1000 * 60 * 60 * 24));
    const semanasActuales = semanasIniciales + Math.floor(diferenciaDias / 7);

    // 6️⃣ Respuesta Exitosa
    return response(res, 'success', 200, 'Semanas de embarazo calculadas correctamente', { 
      semanas_actuales: semanasActuales 
    });

  } catch (error) {
    console.error("Error al obtener semanas de embarazo:", error.message);
    
    // 7️⃣ Error del servidor
    return response(res, 'error', 500, 'Error interno del servidor al obtener las semanas de embarazo', error.message);
  }
};

module.exports={perfilPaciente,registrosPaciente,registrarGlucosa,/*registrarPaciente,*/actualizarPaciente,obtenerSemanasEmbarazoActual};