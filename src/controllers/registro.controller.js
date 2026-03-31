const supabase = require('../../database'); // tu cliente Supabase


const datosParaGlucosa = async (req, res) => {
  const idUsuario = parseInt(req.params.idUsuario);

  try {
    const { data, error } = await supabase
      .rpc('obtener_info_paciente_json', { id_paciente_input: idUsuario });

    if (error) throw error;

    res.json(data); // ✅ data ya es objeto JSON
  } catch (err) {
    console.error('Error al obtener datos paciente:', err);
    res.status(500).json({ error: 'Error al obtener datos paciente' });
  }
};
 


const nodemailer = require("nodemailer");
const { getHipoTemplate, getHiperTemplate } = require("../email/templates");

const registrarAlerta = async (req, res) => {
  const { id_tipo_alerta, id_registro, id_medico, fecha_alerta } = req.body;

  // Validación básica
  if (!id_tipo_alerta || !id_registro || !id_medico || !fecha_alerta) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    // 1️⃣ Insertar alerta (TUS DATOS ORIGINALES)
    const { data, error } = await supabase
      .from('alertas')
      .insert([
        {
          id_tipo_alerta,
          id_registro,
          id_medico,
          fecha_alerta
        }
      ])
      .select();

    if (error) throw error;

    const alertaInsertada = data[0];

    // ----------------------------------------------------------
    // 2️⃣ OBTENER DATOS PARA EL CORREO SEGÚN TU BASE REAL
    // ----------------------------------------------------------

    // Obtener registro de glucosa
    const { data: registro } = await supabase
      .from("registro_glucosa")
      .select("id_paciente, nivel_glucosa, fecha, hora,observaciones")
      .eq("id_registro", id_registro)
      .single();

    if (!registro) throw new Error("Registro de glucosa no encontrado");

    // Obtener paciente
    const { data: paciente } = await supabase
      .from("paciente")
      .select("id_usuario, id_medico")
      .eq("id_paciente", registro.id_paciente)
      .single();

    if (!paciente) throw new Error("Paciente no encontrado");

    // Obtener médico asignado
    const { data: medico } = await supabase
      .from("medico")
      .select("id_usuario")
      .eq("id_medico", paciente.id_medico)
      .single();

    if (!medico) throw new Error("Médico asignado no encontrado");

    // Obtener correo del usuario del médico
    const { data: usuarioMedico } = await supabase
      .from("usuario")
      .select("correo, nombre_completo")
      .eq("id_usuario", medico.id_usuario)
      .single();

    if (!usuarioMedico) throw new Error("Usuario del médico no encontrado");
    
    // Obtener nombre del PACIENTE (usuario del paciente)
    const { data: usuarioPaciente } = await supabase
      .from("usuario")
      .select("nombre_completo")
      .eq("id_usuario", paciente.id_usuario)
      .single();

    if (!usuarioPaciente) throw new Error("Usuario del paciente no encontrado");

    // ----------------------------------------------------------
    // 3️⃣ PREPARAR PLANTILLA DEL CORREO
    // ----------------------------------------------------------

    const datosCorreo = {
      nombrePaciente: usuarioPaciente.nombre_completo,
      // podrías mostrar también el nombre del paciente
      valor: registro.nivel_glucosa,
      fecha: registro.fecha,
      hora: registro.hora,
      nombreMedico:usuarioMedico.nombre_completo,
      observaciones:registro.observaciones
    };

    const template =
      id_tipo_alerta === 1
        ? getHipoTemplate(datosCorreo)
        : getHiperTemplate(datosCorreo);

    // ----------------------------------------------------------
    // 4️⃣ ENVIAR CORREO
    // ----------------------------------------------------------

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
    rejectUnauthorized: false
  }
    });

    await transporter.sendMail({
      from: `"GlucoTracker" <${process.env.EMAIL_USER}>`,
      to: usuarioMedico.correo,
      subject: template.subject,
      html: template.html
    });

    // ----------------------------------------------------------
    // 5️⃣ RESPUESTA (tu código)
    // ----------------------------------------------------------

    res.status(200).json({
      message: 'Alerta registrada y correo enviado correctamente',
      alerta: alertaInsertada
    });

  } catch (err) {
    console.error('Error al insertar alerta:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { registrarAlerta };
module.exports = { datosParaGlucosa ,registrarAlerta };
