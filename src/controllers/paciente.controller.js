const supabase = require('../../database'); // tu cliente Supabase
const bcrypt=require('bcrypt')

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
      return res.status(400).json({ error: "Archivo de perfil faltante" });
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

const perfilPaciente=async (req, res) => {
  const idPaciente = parseInt(req.params.idPaciente);

  try {
    const { data, error } = await supabase
      .rpc('obtener_paciente_por_id', { id_paciente_input: idPaciente });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error al obtener paciente:', err);
    res.status(500).json({ error: 'Error al obtener paciente' });
  }
};


const registrosPaciente= async (req, res) => {
  try {
    const idPaciente = parseInt(req.params.idPaciente);

    const { data, error } = await supabase.rpc('obtener_registros_por_paciente', {
      id_paciente_input: idPaciente
    });

    if (error) {
      console.error('Error ejecutando función:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: 'Error del servidor' });
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
  const id_paciente = req.params.id_paciente;

  try {
    // Obtener si el paciente está embarazado
    const { data: dataPaciente, error: errorPaciente } = await supabase
      .from("paciente")
      .select("embarazo")
      .eq("id_paciente", id_paciente)
      .single();

    if (errorPaciente) throw errorPaciente;

    const embarazo = dataPaciente.embarazo;

    if (embarazo === true) {
      // Obtener el último registro activo de embarazo
      const { data: dataEmbarazo, error: errorEmbarazo } = await supabase
        .from("seguimiento_embarazo")
        .select("fecha_registro, semanas_embarazo")
        .eq("id_paciente", id_paciente)
        .is("fecha_terminacion", null)
        .order("fecha_registro", { ascending: false })
        .limit(1);

      if (errorEmbarazo) throw errorEmbarazo;

      if (!dataEmbarazo || dataEmbarazo.length === 0) {
        // No hay registros activos
        return res.json({ semanas_actuales: null });
      }

      const registro = dataEmbarazo[0];
      const fechaRegistro = new Date(registro.fecha_registro);
      const semanasIniciales = registro.semanas_embarazo;

      // Calcular semanas actuales sumando los días transcurridos desde la fecha del registro
      const hoy = new Date();
      const diferenciaDias = Math.floor((hoy - fechaRegistro) / (1000 * 60 * 60 * 24));
      const semanasActuales = semanasIniciales + Math.floor(diferenciaDias / 7);

      return res.json({ semanas_actuales: semanasActuales });
    } else {
      // Paciente no embarazado
      return res.json({ semanas_actuales: null });
    }
  } catch (error) {
    console.error("Error al obtener semanas de embarazo:", error);
    return res.status(500).json({ error: "Error al obtener semanas de embarazo" });
  }
};

module.exports={perfilPaciente,registrosPaciente,registrarGlucosa,registrarPaciente,actualizarPaciente,obtenerSemanasEmbarazoActual};