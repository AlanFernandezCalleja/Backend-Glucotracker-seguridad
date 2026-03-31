const supabase = require('../../database'); // tu cliente Supabase
const bcrypt = require('bcrypt');

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
    const idUsuario = parseInt(req.params.idUsuario)

    // Llamada a la función RPC con el parámetro
    const { data, error } = await supabase.rpc('obtener_medico_por_usuario', {
      id_usuario_input: idUsuario
    })

    if (error) {
      console.error('Error ejecutando función:', error)
      return res.status(500).json({ error: error.message })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontró el médico' })
    }

    // ✅ Devuelve el resultado como JSON
    return res.status(200).json(data[0]) // devuelve el objeto (no arreglo)

  } catch (err) {
    console.error('Error interno:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
};


const verPacientes = async (req, res) => {
  const { idMedico } = req.params;

  try {
    // 🔹 Ejecutar la función SQL
    const { data, error } = await supabase.rpc("obtener_pacientes_por_medico", {
      id_medico_input: parseInt(idMedico),
    });

    if (error) throw error;

    // 🔹 Si no hay datos, devolvemos vacío
    if (!data || data.length === 0) {
      return res.status(404).json({ mensaje: "No se encontraron pacientes." });
    }

    // 🔹 La función devuelve un arreglo JSON directamente
    res.json(data);
  } catch (err) {
    console.error("Error ejecutando función:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};


const alertasActivas = async (req, res) => {
  try {
    const idMedico = parseInt(req.params.idMedico);

    const { data, error } = await supabase.rpc('obtener_alertas_activas_por_medico', {
      id_medico_input: idMedico
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


const alertasResueltas = async (req, res) => {
  try {
    const idMedico = parseInt(req.params.idMedico);

    const { data, error } = await supabase.rpc('obtener_alertas_resueltas_por_medico', {
      id_medico_input: idMedico
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


const retroalimentacionAlerta = async (req, res) => {
  const { id_medico, fecha_registro, mensaje, alertas_id_alerta } = req.body;

  if (!id_medico || !fecha_registro || !mensaje || !alertas_id_alerta) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    // 1. INSERT en Retroalimentacion
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
      .select();   // Para devolver la fila insertada

    if (retroError) throw retroError;

    // 2. UPDATE en Alertas, poniendo su estado = false
    const { data: alertaUpdate, error: alertaError } = await supabase
      .from('alertas')
      .update({ estado: false })
      .eq('id_alerta', alertas_id_alerta)
      .select();

    if (alertaError) throw alertaError;

    return res.status(200).json({
      message: 'Alerta respondida y actualizada correctamente',
      retroalimentacion: retroData,
      alerta_actualizada: alertaUpdate
    });

  } catch (err) {
    console.error('Error al responder alerta:', err.message);
    res.status(500).json({ error: err.message });
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

  if (!fecha || !hora || !id_medico || !id_momento || !id_paciente || !nivel_glucosa) {
    return res.status(400).json({ error: "Todos los campos (menos observaciones) deben estar llenados" });
  }

  try {
    const { data: glucosaData, error: glucosaError } = await supabase
      .from("registro_glucosa")
      .insert([
        {
          id_paciente,
          id_medico,
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

const actualizarMedico = async (req, res) => {
  const { id_medico } = req.params;
  const { telefono, correo, departamento } = req.body;
  const carnetFile = req.file;

  try {
    // 1️⃣ Obtener id_usuario del médico
    const { data: medico, error: medicoFetchError } = await supabase
      .from('medico')
      .select('id_usuario')
      .eq('id_medico', id_medico)
      .single();

    if (medicoFetchError || !medico) {
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    const { id_usuario } = medico;

    // 2️⃣ Preparar actualizaciones
    const usuarioUpdates = {};
    if (telefono !== undefined) usuarioUpdates["teléfono"] = telefono;
    if (correo !== undefined) usuarioUpdates.correo = correo;

    const medicoUpdates = {};
    if (departamento !== undefined) medicoUpdates.departamento = departamento;

    // 3️⃣ Subir nuevo carnet si hay archivo
    if (carnetFile) {
      const fileName = `carnet-${id_usuario}-${Date.now()}.${carnetFile.originalname.split('.').pop()}`;
      
      // Subir el archivo al bucket
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('Carnets_IMG')
        .upload(
          fileName,
          carnetFile.buffer,
          {
            contentType: carnetFile.mimetype,
            upsert: true
          }
        );

      if (uploadError) throw uploadError;

      // Obtener URL pública - CORRECCIÓN AQUÍ
      const { data: urlData } = supabase
        .storage
        .from('Carnets_IMG')
        .getPublicUrl(uploadData.path);

      // Asignar la URL pública al campo carnet_profesional
      medicoUpdates.carnet_profesional = urlData.publicUrl;
    }

    // 4️⃣ Actualizar tabla usuario
    if (Object.keys(usuarioUpdates).length > 0) {
      const { error } = await supabase
        .from('usuario')
        .update(usuarioUpdates)
        .eq('id_usuario', id_usuario);
      if (error) throw error;
    }

    // 5️⃣ Actualizar tabla medico (INCLUYENDO carnet_profesional)
    if (Object.keys(medicoUpdates).length > 0) {
      const { error } = await supabase
        .from('medico')
        .update(medicoUpdates)
        .eq('id_medico', id_medico);
      if (error) throw error;
    }

    return res.status(200).json({
      message: 'Datos actualizados correctamente',
      carnet_url: medicoUpdates.carnet_profesional || 'No se actualizó el carnet'
    });

  } catch (error) {
    console.error('Error al actualizar:', error);
    return res.status(500).json({
      message: 'Error al actualizar los datos',
      error: error.message
    });
  }
};

// ✅ export correcto
module.exports = {
  verMedicos,
  perfilMedico,
  registrarMedico,
  verPacientes,
  alertasActivas,
  alertasResueltas,
  retroalimentacionAlerta,
  registrarGlucosaMedico,
  actualizarMedico
};
