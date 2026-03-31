const supabase = require('../../database');

const auditoriaPaciente = async (req, res, next) => {
  let called = false; // ✅ para que la auditoría se registre solo una vez

  const originalSend = res.send.bind(res);

  const registrarAuditoria = async () => {
    if (called) return; // ya registrado
    called = true;

    try {
      let id_usuario = req.params?.id_usuario || req.body?.id_usuario || req.query?.id_usuario ||req.params?.idUsuario|| req.body?.idUsuario ||null;
      let id_paciente = req.params?.idPaciente || req.body?.idPaciente || req.query?.idPaciente || req.params?.id_paciente || req.body?.id_paciente ||null;
        let id_registro=req.body?.id_registro;
      // Resolver id_usuario si solo tenemos id_medico
      if (!id_usuario && id_paciente) {
        const { data } = await supabase
          .from('paciente')
          .select('id_usuario')
          .eq('id_paciente', id_paciente)
          .maybeSingle();
        if (data) id_usuario = data.id_usuario || null;
      }

      // Resolver id_medico si solo tenemos id_usuario
      if (!id_paciente && id_usuario) {
        const { data } = await supabase
          .from('paciente')
          .select('id_paciente')
          .eq('id_usuario', id_usuario)
          .maybeSingle();
        if (data) id_paciente = data.id_paciente || null;
      }
      if (id_registro) {
  // Obtener id_paciente desde id_registro
  const { data: registroData, error: registroError } = await supabase
    .from('registro_glucosa')
    .select('id_paciente')
    .eq('id_registro', id_registro)
    .maybeSingle();

  if (registroError) {
    console.error('Error obteniendo registro_glucosa:', registroError.message);
  }

    if (registroData) {
        id_paciente = registroData.id_paciente;
        
        // Obtener id_usuario desde id_paciente
        const { data: pacienteData, error: pacienteError } = await supabase
        .from('paciente')
        .select('id_usuario')
        .eq('id_paciente', id_paciente)
        .maybeSingle();

        if (pacienteError) {
        console.error('Error obteniendo paciente:', pacienteError.message);
        }

        if (pacienteData) {
        id_usuario = pacienteData.id_usuario || null;
        }
    }
    }


      // Insertar auditoría
      await supabase.from('auditoria_endpoints').insert([{
        id_usuario,
        rol: 'paciente',
        id_rol: id_paciente,
        endpoint: req.originalUrl,
        operacion: req.method,
        exito: res.statusCode < 400,
        codigo_http: res.statusCode,
        ip_origen: req.ip
      }]);
    } catch (err) {
      console.error('Error auditoría medico:', err?.message || err);
    }
  };

  // Sobrescribir solo res.send
  res.send = async (body) => {
    await registrarAuditoria();
    return originalSend(body);
  };

  next();
};

module.exports = auditoriaPaciente;
