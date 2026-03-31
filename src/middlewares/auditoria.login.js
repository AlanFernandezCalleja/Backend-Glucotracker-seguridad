const supabase = require('../../database');

const auditoriaEndpoint = (rolDefecto = null) => {
  return async (req, res, next) => {
    let called = false;
    const originalSend = res.send.bind(res);

    res.send = async (body) => {
      if (!called) {
        called = true;

        try {
          let id_usuario = req.params?.id_usuario || req.body?.id_usuario || req.query?.id_usuario || null;
          let id_rol = req.params?.id_rol || req.body?.id_rol || req.query?.id_rol || null;
          let rol = rolDefecto || null;

          // Intentar extraer id_usuario desde la respuesta JSON si existe
          try {
            const responseBody = typeof body === 'string' ? JSON.parse(body) : body;
            if (responseBody?.id_usuario) {
              id_usuario = responseBody.id_usuario;
            }
            if(responseBody?.id_rol){
                id_rol=responseBody.id_rol
            }
          } catch (err) {
            // no es JSON válido, ignorar
          }

          // Resolver id_rol si no se pasó
          if (!id_rol && id_usuario && rolDefecto) {
            const { data } = await supabase
              .from(rolDefecto)
              .select(`id_${rolDefecto}`)
              .eq('id_usuario', id_usuario)
              .maybeSingle();
            if (data) id_rol = data[`id_${rolDefecto}`];
          }

          // Insertar auditoría
          await supabase.from('auditoria_endpoints').insert([{
            id_usuario,
            rol:"login",
            id_rol,
            endpoint: req.originalUrl,
            operacion: req.method,
            exito: res.statusCode < 400,
            codigo_http: res.statusCode,
            ip_origen: req.ip
          }]);
        } catch (err) {
          console.error('Error auditoría endpoint:', err?.message || err);
        }
      }

      return originalSend(body);
    };

    next();
  };
};

module.exports = auditoriaEndpoint;
