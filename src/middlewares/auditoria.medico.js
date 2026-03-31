const supabase = require('../../database');

const auditoriaMedico = async (req, res, next) => {
  let called = false; // ✅ para que la auditoría se registre solo una vez

  const originalSend = res.send.bind(res);

  const registrarAuditoria = async () => {
    if (called) return; // ya registrado
    called = true;

    try {
      let id_usuario = req.params?.id_usuario || req.body?.id_usuario || req.query?.id_usuario ||req.params?.idUsuario|| null;
      let id_medico = req.params?.idMedico || req.body?.idMedico || req.query?.idMedico || req.params?.id_medico || req.body?.id_medico ||null;

      // Resolver id_usuario si solo tenemos id_medico
      if (!id_usuario && id_medico) {
        const { data } = await supabase
          .from('medico')
          .select('id_usuario')
          .eq('id_medico', id_medico)
          .maybeSingle();
        if (data) id_usuario = data.id_usuario || null;
      }

      // Resolver id_medico si solo tenemos id_usuario
      if (!id_medico && id_usuario) {
        const { data } = await supabase
          .from('medico')
          .select('id_medico')
          .eq('id_usuario', id_usuario)
          .maybeSingle();
        if (data) id_medico = data.id_medico || null;
      }

      // Insertar auditoría
      await supabase.from('auditoria_endpoints').insert([{
        id_usuario,
        rol: 'medico',
        id_rol: id_medico,
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

module.exports = auditoriaMedico;
