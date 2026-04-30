const supabase = require('../../database'); // tu cliente Supabase
const bcrypt = require('bcrypt');
const response = (res, status, code, message, data = null) => {
  return res.status(code).json({
    status,
    code,
    message,
    data
  });
};
/*
const registrarMedico = async (req, res) => {
  try {
    const { nombre_completo, correo, contrasena, telefono, fecha_nac, id_especialidad, departamento } = req.body;

    // 1️⃣ Validar archivos
    const pdfFiles = req.files?.matriculaProfesional;
    const imgFiles = req.files?.carnetProfesional;

    if (!pdfFiles || pdfFiles.length === 0) {
      return res.status(400).json({ error: "Archivo de matrícula faltante" });
    }
    if (!imgFiles || imgFiles.length === 0) {
      return res.status(400).json({ error: "Archivo de carnet faltante" });
    }

    const pdf = pdfFiles[0];
    const img = imgFiles[0];

    // 2️⃣ Subir archivos a Supabase
    const pdfUpload = await supabase.storage
      .from("Matriculas_PDF")
      .upload(`pdfs/${Date.now()}_${pdf.originalname}`, pdf.buffer, { contentType: pdf.mimetype });

    const imgUpload = await supabase.storage
      .from("Carnets_IMG")
      .upload(`imgs/${Date.now()}_${img.originalname}`, img.buffer, { contentType: img.mimetype });

    if (pdfUpload.error) throw pdfUpload.error;
    if (imgUpload.error) throw imgUpload.error;

    const pdfUrl = supabase.storage.from("Matriculas_PDF").getPublicUrl(pdfUpload.data.path).data.publicUrl;
    const imgUrl = supabase.storage.from("Carnets_IMG").getPublicUrl(imgUpload.data.path).data.publicUrl;

    // 3️⃣ Hashear contraseña
    const hashed_contrasena = await bcrypt.hash(contrasena, 10);
    const rol = 'medico';

    // 4️⃣ Insertar usuario
    const { data: usuarioData, error: usuarioError } = await supabase
      .from("usuario")
      .insert([{
        nombre_completo,
        correo,
        contrasena: hashed_contrasena,
        rol,
        "teléfono": telefono,
        fecha_nac
      }])
      .select();

    if (usuarioError) throw usuarioError;
    const usuario = usuarioData[0];

    // 5️⃣ Insertar médico
    const { data: medicoData, error: medicoError } = await supabase
      .from('medico')
      .insert([{
        id_usuario: usuario.id_usuario,
        id_especialidad,
        matricula_profesional: pdfUrl,
        departamento,
        carnet_profesional: imgUrl,
        administrador_id_admin: 1
      }])
      .select();

    if (medicoError) throw medicoError;

    res.status(200).json({ mensaje: "Médico registrado correctamente", usuario, medico: medicoData[0] });

  } catch (error) {
    console.error("❌ Error en registrarMedico:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { registrarMedico };

*/


const verMedicos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('medico')
      .select(`
        id_medico,
        usuario ( nombre_completo )
      `);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener médicos:', error.message);
    res.status(500).json({ error: 'Error al obtener médicos' });
  }
};



const perfilMedico = async (req, res) => {
  try {
    const idUsuario = parseInt(req.params.idUsuario);

    // 🔹 Validación básica de entrada
    if (isNaN(idUsuario)) {
      return response(res, 'error', 400, 'El ID de usuario proporcionado no es válido');
    }

    // 1️⃣ Consulta Relacional con Supabase
    // Traemos datos del médico, cruzamos con su usuario, y cruzamos con el administrador (y el usuario del admin)
    const { data: medicoData, error } = await supabase
      .from('medico')
      .select(`
        id_medico,
        matricula_profesional,
        departamento,
        carnet_profesional,
        usuario!inner (
          nombre_completo,
          fecha_nac,
          teléfono,
          correo
        ),
        administrador (
          usuario (
            nombre_completo
          )
        )
      `)
      .eq('id_usuario', idUsuario)
      .maybeSingle(); // 👈 Devuelve el objeto directo o null si no hay coincidencias

    if (error) {
      console.error('Error en consulta Supabase:', error.message);
      throw error;
    }

    // 2️⃣ Validación de existencia
    if (!medicoData) {
      return response(res, 'error', 404, 'No se encontró el médico en el sistema');
    }

    // 3️⃣ Transformación de los datos
    // Mapeamos el resultado para que mantenga exactamente las mismas llaves que devolvía tu SQL
    const perfilFormateado = {
      id: medicoData.id_medico,
      nombre: medicoData.usuario?.nombre_completo,
      fechaNac: medicoData.usuario?.fecha_nac,
      telefono: medicoData.usuario?.teléfono,
      correo: medicoData.usuario?.correo,
      matricula: medicoData.matricula_profesional,
      departamento: medicoData.departamento,
      carnet: medicoData.carnet_profesional,
      // Manejo seguro del COALESCE usando encadenamiento opcional
      admin: medicoData.administrador?.usuario?.nombre_completo || 'No' 
    };

    // 4️⃣ Respuesta Exitosa
    return response(res, 'success', 200, 'Perfil del médico obtenido correctamente', perfilFormateado);

  } catch (err) {
    console.error('Error interno en perfilMedico:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar la solicitud');
  }
};

const formatearFecha = (fechaString) => {
  if (!fechaString) return null;
  // Extraemos año, mes y día de forma segura ignorando la zona horaria
  const [year, month, day] = fechaString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

const verPacientes = async (req, res) => {
  const { idMedico } = req.params;

  if (!idMedico || isNaN(idMedico)) {
    return response(res, 'error', 400, 'El ID del médico proporcionado no es válido');
  }

  try {
    // 1️⃣ CONSULTA RELACIONAL CON SUPABASE
    // Usamos '!inner' en usuario para forzar un INNER JOIN y filtrar solo pacientes activos
    const { data: pacientesBD, error } = await supabase
      .from('paciente')
      .select(`
        id_paciente, genero, peso, altura, numero_emergencia, nombre_emergencia, foto_perfil,
        usuario!inner ( id_usuario, nombre_completo, fecha_nac, teléfono, correo, estado ),
        nivel_actividad_fisica ( descripcion ),
        paciente_enfermedad ( enfermedades_base ( nombre_enfermedad ) ),
        tratamiento_enfermedad ( dosis, tratamientos ( nombre_tratamiento, descripcion ) ),
        registro_glucosa (
          id_registro, fecha, hora, nivel_glucosa, observaciones,
          momento_dia ( momento ),
          alertas (
            id_alerta, 
            tipo_alerta ( tipo ),
            retroalimentacion ( mensaje )
          )
        )
      `)
      .eq('id_medico', parseInt(idMedico))
      .eq('usuario.estado', true);

    if (error) throw error;

    if (!pacientesBD || pacientesBD.length === 0) {
      return response(res, 'success', 200, "El médico aún no tiene pacientes asignados.", []);
    }

    // 2️⃣ TRANSFORMACIÓN DE DATOS (Mapeo a la estructura exacta de tu SQL)
    const pacientesFormateados = pacientesBD.map((p) => {
      // Formatear Afecciones
      const afecciones = p.paciente_enfermedad ? p.paciente_enfermedad.map(pe => ({
        afeccion: pe.enfermedades_base?.nombre_enfermedad || null
      })) : [];

      // Formatear Tratamientos
      const tratamientos = p.tratamiento_enfermedad ? p.tratamiento_enfermedad.map(te => ({
        titulo: te.tratamientos?.nombre_tratamiento || null,
        desc: te.tratamientos?.descripcion || null,
        dosis: String(te.dosis)
      })) : [];

      // Procesar y agrupar Historial de Glucosa
      const historialMap = {};
      
      // Ordenamos los registros: primero por fecha (DESC), luego por hora (ASC)
      const registrosOrdenados = (p.registro_glucosa || []).sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha > b.fecha ? -1 : 1; 
        return a.hora < b.hora ? -1 : 1;
      });

      registrosOrdenados.forEach((reg) => {
        const fechaFormateada = formatearFecha(reg.fecha);
        
        if (!historialMap[fechaFormateada]) {
          historialMap[fechaFormateada] = { fecha: fechaFormateada, registros: [] };
        }

        // Estructurar alerta si existe
        let alertaObj = null;
        if (reg.alertas && reg.alertas.length > 0) {
          const alertaData = reg.alertas[0]; // Tomamos la primera alerta
          alertaObj = {
            nivel: alertaData.tipo_alerta?.tipo || null,
            observacion: reg.observaciones,
            // retroalimentacion es un arreglo al venir de una relación 1 a N
            mensaje: (alertaData.retroalimentacion && alertaData.retroalimentacion.length > 0) 
                     ? alertaData.retroalimentacion[0].mensaje 
                     : null 
          };
        }

        historialMap[fechaFormateada].registros.push({
          fecha: fechaFormateada,
          hora: reg.hora ? reg.hora.substring(0, 5) : null, // Cortamos a 'HH:MI'
          momento: reg.momento_dia?.momento || null,
          glucosa: String(reg.nivel_glucosa),
          alerta: alertaObj
        });
      });

      // Convertimos el objeto a un arreglo de objetos ordenado
      const historial = Object.values(historialMap);

      // 3️⃣ ESTRUCTURA DEL PACIENTE FINAL
      return {
        id: p.id_paciente,
        nombre: p.usuario.nombre_completo,
        ci: String(p.usuario.id_usuario),
        fechaNac: formatearFecha(p.usuario.fecha_nac),
        genero: p.genero,
        peso: String(p.peso),
        altura: String(p.altura),
        actividadFisica: p.nivel_actividad_fisica?.descripcion || null,
        telefono: p.usuario.teléfono,
        Correo: p.usuario.correo,
        numero_emergencia: p.numero_emergencia,
        nombre_emergencia: p.nombre_emergencia,
        foto_perfil: p.foto_perfil,
        afecciones: afecciones,
        tratamientos: tratamientos,
        historial: historial
      };
    });

    // Devolvemos la respuesta formateada y estandarizada
    return response(res, 'success', 200, "Pacientes obtenidos correctamente.", pacientesFormateados);

  } catch (err) {
    console.error("❌ Error en verPacientes:", err.message);
    return response(res, 'error', 500, "Error interno del servidor al procesar la lista de pacientes.");
  }
};

const alertasActivas = async (req, res) => {
  try {
    const idMedico = parseInt(req.params.idMedico);

    if (isNaN(idMedico)) {
      return response(res, 'error', 400, 'El ID del médico proporcionado no es válido');
    }

    // 1️⃣ Consulta Supabase replicando tu SQL exacto
    const { data: alertasBD, error } = await supabase
      .from('alertas')
      .select(`
        id_alerta,
        estado,
        fecha_alerta,
        tipo_alerta!inner ( tipo ),
        registro_glucosa!inner (
          id_registro,
          fecha,
          hora,
          nivel_glucosa,
          observaciones,
          momento_dia ( momento ),
          paciente!inner (
            id_paciente,
            id_medico,
            usuario!inner ( nombre_completo )
          )
        )
      `)
      .eq('estado', true) // a.estado = true
      // 🔥 AQUÍ ESTÁ TU LÓGICA: p.id_medico = 2
      .eq('registro_glucosa.paciente.id_medico', idMedico) 
      // 🔥 AQUÍ ESTÁ TU ORDEN: order by a.fecha_alerta desc
      .order('fecha_alerta', { ascending: false });

    if (error) {
      console.error('Error en consulta Supabase:', error.message);
      throw error;
    }

    if (!alertasBD || alertasBD.length === 0) {
      return response(res, 'success', 200, 'No hay alertas activas en este momento', []);
    }

    // 2️⃣ Mapeo para cumplir con tu interfaz de Angular
    const alertasFormateadas = alertasBD.map(alerta => ({
      id: alerta.id_alerta,
      nivel: alerta.tipo_alerta?.tipo || '',
      idpaciente: alerta.registro_glucosa.paciente.id_paciente,
      paciente: alerta.registro_glucosa.paciente.usuario.nombre_completo,
      fecha: alerta.fecha_alerta || alerta.registro_glucosa.fecha,
      hora: alerta.registro_glucosa.hora,
      glucosa: alerta.registro_glucosa.nivel_glucosa,
      momento: alerta.registro_glucosa.momento_dia?.momento || '',
      observaciones: alerta.registro_glucosa.observaciones || ''
    }));

    return response(res, 'success', 200, 'Alertas activas obtenidas correctamente', alertasFormateadas);

  } catch (err) {
    console.error('Error interno en alertasActivas:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar las alertas');
  }
};

const alertasResueltas = async (req, res) => {
  try {
    const idMedico = parseInt(req.params.idMedico);

    if (isNaN(idMedico)) {
      return response(res, 'error', 400, 'El ID del médico proporcionado no es válido');
    }

    // 1️⃣ Consulta Supabase replicando tu lógica SQL (con estado = false)
    const { data: alertasBD, error } = await supabase
      .from('alertas')
      .select(`
        id_alerta,
        estado,
        fecha_alerta,
        tipo_alerta!inner ( tipo ),
        registro_glucosa!inner (
          id_registro,
          fecha,
          hora,
          nivel_glucosa,
          observaciones,
          momento_dia ( momento ),
          paciente!inner (
            id_paciente,
            id_medico,
            usuario!inner ( nombre_completo )
          )
        ),
        retroalimentacion ( mensaje ) 
      `)
      .eq('estado', false) // 🔥 Solo alertas resueltas
      .eq('registro_glucosa.paciente.id_medico', idMedico) // 🔥 Filtro corregido apuntando al paciente
      .order('fecha_alerta', { ascending: false }); // 🔥 Ordenamos de la más reciente a la más antigua

    if (error) {
      console.error('Error en consulta Supabase (alertasResueltas):', error.message);
      throw error;
    }

    if (!alertasBD || alertasBD.length === 0) {
      return response(res, 'success', 200, 'No hay alertas resueltas en el historial', []);
    }

    // 2️⃣ Mapeo para cumplir con tu interfaz de Angular
    const alertasFormateadas = alertasBD.map(alerta => ({
      id: alerta.id_alerta,
      nivel: alerta.tipo_alerta?.tipo || '',
      idpaciente: alerta.registro_glucosa.paciente.id_paciente,
      paciente: alerta.registro_glucosa.paciente.usuario.nombre_completo,
      fecha: alerta.fecha_alerta || alerta.registro_glucosa.fecha,
      hora: alerta.registro_glucosa.hora,
      glucosa: alerta.registro_glucosa.nivel_glucosa,
      momento: alerta.registro_glucosa.momento_dia?.momento || '',
      observaciones: alerta.registro_glucosa.observaciones || '',
      // Extraemos el mensaje de la retroalimentación (Supabase lo devuelve como arreglo)
      mensaje: (alerta.retroalimentacion && alerta.retroalimentacion.length > 0) 
               ? alerta.retroalimentacion[0].mensaje 
               : 'Sin mensaje'
    }));

    return response(res, 'success', 200, 'Historial de alertas resueltas obtenido correctamente', alertasFormateadas);

  } catch (err) {
    console.error('Error interno en alertasResueltas:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar el historial de alertas');
  }
};

const retroalimentacionAlerta = async (req, res) => {
  const { id_medico, fecha_registro, mensaje, alertas_id_alerta } = req.body;

  // 1️⃣ Validación de campos
  if (!id_medico || !fecha_registro || !mensaje || !alertas_id_alerta) {
    return response(res, 'error', 400, 'Todos los campos son requeridos para resolver la alerta');
  }

  try {
    // 2️⃣ INSERT en Retroalimentacion
    const { data: retroData, error: retroError } = await supabase
      .from('retroalimentacion')
      .insert([
        {
          id_medico,
          fecha_registro,
          mensaje,
          alertas_id_alerta
        }
      ])
      .select();

    if (retroError) throw retroError;

    // 3️⃣ UPDATE en Alertas, poniendo su estado = false (Resuelta)
    const { data: alertaUpdate, error: alertaError } = await supabase
      .from('alertas')
      .update({ estado: false })
      .eq('id_alerta', alertas_id_alerta)
      .select();

    if (alertaError) throw alertaError;

    // 4️⃣ Respuesta exitosa estandarizada
    // Pasamos un objeto con ambas datas dentro del parámetro "data" de nuestra función response
    return response(res, 'success', 200, 'Alerta respondida y actualizada correctamente', {
      retroalimentacion: retroData,
      alerta_actualizada: alertaUpdate
    });

  } catch (err) {
    console.error('Error al responder alerta:', err.message);
    
    // 5️⃣ Manejo de error del servidor
    return response(res, 'error', 500, 'Error interno del servidor al responder la alerta', err.message);
  }
};

const registrarGlucosaMedico = async (req, res) => {
  const {
    fecha,
    hora,
    id_medico,
    id_momento,
    id_paciente,
    nivel_glucosa,
    observaciones
  } = req.body;

  // 1️⃣ Validación de campos obligatorios
  if (!fecha || !hora || !id_medico || !id_momento || !id_paciente || !nivel_glucosa) {
    return response(
      res, 
      'error', 
      400, 
      "Todos los campos (menos observaciones) deben estar llenados"
    );
  }

  try {
    // 2️⃣ Inserción en la base de datos
    const { data: glucosaData, error: glucosaError } = await supabase
      .from("registro_glucosa")
      .insert([
        {
          id_paciente: parseInt(id_paciente),
          id_medico: parseInt(id_medico),
          id_momento: parseInt(id_momento),
          fecha,
          hora,
          nivel_glucosa: parseFloat(nivel_glucosa),
          observaciones: observaciones || null
        }
      ])
      .select();

    if (glucosaError) throw glucosaError;

    const registro_glucosa = glucosaData[0];

    // 3️⃣ Respuesta exitosa estandarizada
    return response(
      res, 
      'success', 
      201, 
      "Registro de glucosa insertado correctamente", 
      {
        id_registro: registro_glucosa.id_registro, // Corregido según tu esquema (id_registro)
        registro: registro_glucosa
      }
    );

  } catch (error) {
    console.error("Error en registrarGlucosaMedico: ", error.message);
    
    // 4️⃣ Manejo de error del servidor
    return response(
      res, 
      'error', 
      500, 
      "Error interno del servidor al registrar la medición de glucosa",
      error.message
    );
  }
};
const actualizarMedico = async (req, res) => {
  const { id_medico } = req.params;
  const { telefono, correo, departamento } = req.body;
  const carnetFile = req.file;

  try {
    // 1️⃣ Obtener id_usuario del médico para poder actualizar la tabla de usuarios
    const { data: medico, error: medicoFetchError } = await supabase
      .from('medico')
      .select('id_usuario')
      .eq('id_medico', id_medico)
      .single();

    if (medicoFetchError || !medico) {
      return response(res, 'error', 404, 'Médico no encontrado en el sistema');
    }

    const { id_usuario } = medico;

    // 2️⃣ Preparar objetos de actualización dinámicos
    const usuarioUpdates = {};
    if (telefono !== undefined) usuarioUpdates["teléfono"] = telefono;
    if (correo !== undefined) usuarioUpdates.correo = correo;

    const medicoUpdates = {};
    if (departamento !== undefined) medicoUpdates.departamento = departamento;

    // 3️⃣ Gestión del archivo (Carnet Profesional)
    if (carnetFile) {
      // Generamos un nombre único para evitar sobreescritura accidental
      const extension = carnetFile.originalname.split('.').pop();
      const fileName = `carnet-${id_usuario}-${Date.now()}.${extension}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('Carnets_IMG')
        .upload(fileName, carnetFile.buffer, {
          contentType: carnetFile.mimetype,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obtener la URL pública del nuevo archivo
      const { data: urlData } = supabase
        .storage
        .from('Carnets_IMG')
        .getPublicUrl(uploadData.path);

      medicoUpdates.carnet_profesional = urlData.publicUrl;
    }

    // 4️⃣ Ejecutar actualizaciones en la tabla 'usuario'
    if (Object.keys(usuarioUpdates).length > 0) {
      const { error: errorUsuario } = await supabase
        .from('usuario')
        .update(usuarioUpdates)
        .eq('id_usuario', id_usuario);
      
      if (errorUsuario) throw errorUsuario;
    }

    // 5️⃣ Ejecutar actualizaciones en la tabla 'medico'
    if (Object.keys(medicoUpdates).length > 0) {
      const { error: errorMedico } = await supabase
        .from('medico')
        .update(medicoUpdates)
        .eq('id_medico', id_medico);
      
      if (errorMedico) throw errorMedico;
    }

    // 6️⃣ Respuesta exitosa estandarizada
    return response(res, 'success', 200, 'Los datos del médico se actualizaron correctamente', {
      id_medico,
      actualizado_usuario: Object.keys(usuarioUpdates).length > 0,
      actualizado_perfil: Object.keys(medicoUpdates).length > 0,
      nueva_url_carnet: medicoUpdates.carnet_profesional || null
    });

  } catch (error) {
    console.error('Error en actualizarMedico:', error.message);
    
    return response(
      res, 
      'error', 
      500, 
      'Ocurrió un error al intentar actualizar los datos del médico',
      error.message
    );
  }
};

// ✅ export correcto
module.exports = {
  verMedicos,
  perfilMedico,
  verPacientes,
  alertasActivas,
  alertasResueltas,
  retroalimentacionAlerta,
  registrarGlucosaMedico,
  actualizarMedico
};
