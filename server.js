
const express = require('express');
const supabase = require('./database');
const bcrypt = require('bcrypt');
require('dotenv').config();
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const crypto = require('crypto');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
app.use(express.json());
const { sendEmail } = require('./src/email/sendEmail');
const { getOtpTemplate } = require('./src/email/templates');
const { setOTP } = require("./otpCache")
const loginPrueba = require('./src/controllers/auth.controller')
app.use(cors({
  origin: ['http://localhost:4200', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));



// // Endpoint POST para login
// app.post('/api/login', async (req, res) => {
//     const { correo, contrasena } = req.body;

//     const { data: usuarioData, error: usuarioError } = await supabase
//         .from("usuario")
//         .select("id_usuario, correo, contrasena, rol")
//         .eq("correo", correo)
//         .eq("estado", true);

//     if (usuarioError) throw usuarioError;

//     // VALIDACIÓN CORRECTA
//     if (!usuarioData || usuarioData.length === 0) {
//         return res.status(401).json({ error: `No se encontró ningún usuario con correo: ${correo}` });
//     }

//     const usuario = usuarioData[0];

//     const id_usuario = usuario.id_usuario;
//     const rol = usuario.rol;
//     let id_rol = 0;

//     if (rol === "administrador") {
//         const { data: adminData, error: adminError } = await supabase
//             .from("administrador")
//             .select("id_admin")
//             .eq("id_usuario", id_usuario)
//             .single();

//         if (adminError) throw adminError;
//         id_rol = adminData.id_admin;

//     } else if (rol === "medico") {
//         const { data: medicoData, error: medicoError } = await supabase
//             .from("medico")
//             .select("id_medico")
//             .eq("id_usuario", id_usuario)
//             .single();

//         if (medicoError) throw medicoError;
//         id_rol = medicoData.id_medico;

//     } else {
//         const { data: pacienteData, error: pacienteError } = await supabase
//             .from("paciente")
//             .select("id_paciente")
//             .eq("id_usuario", id_usuario)
//             .single();

//         if (pacienteError) throw pacienteError;
//         id_rol = pacienteData.id_paciente;
//     }

//     const isMatch = await bcrypt.compare(String(contrasena), usuario.contrasena);

//     if (!isMatch) {
//         return res.status(401).json({ error: 'Contraseña incorrecta' });
//     }

//     res.status(200).json({
//         message: "Credenciales correctas, login exitoso",
//         id_usuario: id_usuario,
//         id_rol: id_rol,
//         rol: rol
//     });
// });
const auditoriaEndpoint = require('./src/middlewares/auditoria.login');

const cookieParser = require('cookie-parser');
app.use(cookieParser());
const response = (res, status, code, message, data = null) => {
  return res.status(code).json({
    status,
    code,
    message,
    data
  });
};


app.post('/api/prueba/login', loginPrueba)
app.post('/api/login', auditoriaEndpoint(), async (req, res) => {
  const { correo, contrasena } = req.body;
  const MENSAJE_ERROR_AUTH = 'Correo o contraseña incorrectos';

  // 1️⃣ Validación preventiva: Evita caídas si envían body vacío (Rama HEAD)
  if (!correo || !contrasena) {
    return response(res, 'error', 400, 'El correo y la contraseña son obligatorios');
  }

  try {
    // 2️⃣ Buscar usuario incluyendo TODOS los campos necesarios de ambas ramas
    const { data: usuarioData, error: usuarioError } = await supabase
      .from("usuario")
      .select("id_usuario, correo, contrasena, rol, estado, intentos_fallidos, bloqueado_hasta, fecha_cambio_contrasena")
      .eq("correo", correo)
      .single();

    // Si Supabase no encuentra el correo, devuelve PGRST116
    if ((usuarioError && usuarioError.code === 'PGRST116') || !usuarioData) {
      console.log(`[LOGIN FALLIDO] Correo inexistente: ${correo}`);
      return response(res, 'error', 401, MENSAJE_ERROR_AUTH);
    }

    // Cualquier otro error de base de datos
    if (usuarioError) throw usuarioError;

    const usuario = usuarioData;

    // 3️⃣ Verificar si la cuenta está inactiva o bloqueada (Rama HEAD + Seguridad)
    if (usuario.estado === false) {
      if (usuario.intentos_fallidos >= 3) {
        console.log(`[LOGIN RECHAZADO] Cuenta bloqueada por intentos: ${correo}`);
        return response(res, 'error', 403, 'Cuenta bloqueada por múltiples intentos fallidos.', { code: 'UNLOCK_REQUIRED', id_usuario: usuario.id_usuario });
      }
      console.log(`[LOGIN RECHAZADO] Cuenta inactiva: ${correo}`);
      return response(res, 'error', 403, 'Tu cuenta está inactiva. Por favor contacta a soporte.');
    }

    // 5️⃣ Verificar contraseña de forma segura
    const isMatch = await bcrypt.compare(String(contrasena), usuario.contrasena);

    if (!isMatch) {
      // 🔸 Lógica de seguridad: Incrementar intentos fallidos
      const nuevosIntentos = (usuario.intentos_fallidos || 0) + 1;
      let updateData = { intentos_fallidos: nuevosIntentos };

      if (nuevosIntentos >= 3) {
        // Bloquear cuenta (suspender usuario)
        updateData.estado = false;
        // Opcional: mantener bloqueado_hasta si se quiere, pero estado: false ya bloquea
        const fechaDesbloqueo = new Date();
        fechaDesbloqueo.setFullYear(fechaDesbloqueo.getFullYear() + 100);
        updateData.bloqueado_hasta = fechaDesbloqueo.toISOString();
      }

      await supabase.from("usuario").update(updateData).eq("id_usuario", usuario.id_usuario);

      const mensaje = nuevosIntentos >= 3
        ? 'Cuenta bloqueada por múltiples intentos fallidos.'
        : MENSAJE_ERROR_AUTH;

      console.log(`[LOGIN FALLIDO] Intento ${nuevosIntentos} fallido para: ${correo}`);
      
      if (nuevosIntentos === 3) {
        return response(res, 'error', 401, mensaje, { code: 'ACCOUNT_BLOCKED_NOW' });
      }
      return response(res, 'error', 401, mensaje);
    }

    // --- HASTA AQUÍ LAS CREDENCIALES SON 100% CORRECTAS ---

    // 6️⃣ Reiniciar intentos fallidos tras éxito (Rama Seguridad)
    if (usuario.intentos_fallidos > 0) {
      await supabase.from("usuario").update({ intentos_fallidos: 0, bloqueado_hasta: null }).eq("id_usuario", usuario.id_usuario);
    }

    // Verificar vigencia (3 meses) usando historial_contrasena
    const { data: historialData } = await supabase
      .from('historial_contrasena')
      .select('created_at')
      .eq('usuario_id_usuario', usuario.id_usuario)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let fechaCambio = usuario.fecha_cambio_contrasena;
    if (historialData && historialData.created_at) {
      fechaCambio = historialData.created_at;
    }

    if (fechaCambio) {
      const tresMesesAtras = new Date();
      tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
      if (new Date(fechaCambio) < tresMesesAtras) {
        return res.status(403).json({
          error: 'Tu contraseña ha caducado (más de 3 meses). Por favor, actualízala.',
          code: 'PASSWORD_EXPIRED',
          data: { id_usuario: usuario.id_usuario }
        });
      }
    }

    // 8️⃣ Buscar Rol del Usuario (Soporta rol 'soporte' de la Rama HEAD)
    const rolMap = {
      administrador: 'id_admin',
      soporte: 'id_admin',
      paciente: 'id_paciente',
      medico: 'id_medico'
    };

    let tablaRol = usuario.rol;
    if (tablaRol === "soporte") {
      tablaRol = "administrador"; // Los soportes se guardan en la tabla administrador
    }

    const columnaIdRol = rolMap[usuario.rol];

    const { data: rolData, error: rolError } = await supabase
      .from(tablaRol)
      .select(columnaIdRol)
      .eq("id_usuario", usuario.id_usuario)
      .single();

    if (rolError || !rolData) {
      throw new Error(`Inconsistencia en BD: No se encontró registro en ${tablaRol} para usuario ${usuario.id_usuario}`);
    }

    const id_rol = rolData[columnaIdRol];

    // 9️⃣ Generar y enviar OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
    setOTP(usuario.id_usuario, otp, 5 * 60 * 1000); // 5 minutos

    const { subject, html } = getOtpTemplate({
      nombreUsuario: usuario.correo,
      codigo: otp
    });

    await sendEmail(usuario.correo, subject, html);
    console.log(`[LOGIN EXITOSO] OTP enviado a: ${correo}`);

    // 🔟 Respuesta final estandarizada
    return response(res, 'success', 200, 'Credenciales correctas. OTP enviado al correo.', {
      id_usuario: usuario.id_usuario,
      id_rol: id_rol
    });

  } catch (error) {
    console.error(`[ERROR CRÍTICO LOGIN] ${correo} - IP: ${req.ip} - Motivo:`, error.message);
    return response(res, 'error', 500, 'Ocurrió un error interno del servidor al procesar tu solicitud. Intenta nuevamente.');
  }
});
// Importación de la rama de seguridad (asegúrate de que la ruta sea correcta)
const { esContrasenaRobusta } = require('./src/utils/security');

app.put('/usuario/:id_usuario/password', async (req, res) => {
  const { id_usuario } = req.params;
  const { contrasena } = req.body;

  // 1️⃣ Validar robustez de la contraseña
  const validacion = esContrasenaRobusta(contrasena);
  if (!validacion.valida) {
    return response(res, 'error', 400, validacion.mensaje);
  }

  try {
    // 2️⃣ Obtener datos del usuario actual
    const { data: usuario, error: userError } = await supabase
      .from('usuario')
      .select('contrasena')
      .eq('id_usuario', id_usuario)
      .single();

    if (userError || !usuario) {
      return response(res, 'error', 404, 'Usuario no encontrado en el sistema.');
    }

    // 3️⃣ Revisar historial de contraseñas
    const { data: historial } = await supabase
      .from('historial_contrasena')
      .select('contrasena_hash')
      .eq('usuario_id_usuario', id_usuario);

    let hashUsado = false;

    // Comparar con el historial
    if (historial && historial.length > 0) {
      for (let rec of historial) {
        if (await bcrypt.compare(String(contrasena), rec.contrasena_hash)) {
          hashUsado = true;
          break;
        }
      }
    }

    // Comparar con la contraseña actual
    if (!hashUsado) {
      hashUsado = await bcrypt.compare(String(contrasena), usuario.contrasena);
    }

    if (hashUsado) {
      return response(res, 'error', 400, 'La contraseña no puede ser igual a una utilizada anteriormente.');
    }

    // 4️⃣ Hashear la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    // 5️⃣ Guardar en historial
    await supabase.from('historial_contrasena').insert({
      usuario_id_usuario: id_usuario,
      contrasena_hash: hashedPassword
    });

    // 6️⃣ Actualizar usuario (desbloquear cuenta y reiniciar intentos)
    const { data, error } = await supabase
      .from('usuario')
      .update({
        contrasena: hashedPassword,
        fecha_cambio_contrasena: new Date().toISOString(),
        intentos_fallidos: 0,
        bloqueado_hasta: null
      })
      .eq('id_usuario', id_usuario)
      .select('id_usuario, nombre_completo, correo');

    if (error) throw error;

    return response(res, 'success', 200, 'Contraseña actualizada correctamente.', data[0]);

  } catch (err) {
    console.error('Error al actualizar contraseña:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al actualizar la contraseña.');
  }
});
const { getOTP, deleteOTP } = require('./otpCache');
const { generateToken } = require('./src/utils/auth');
app.post('/api/verify-otp', auditoriaEndpoint(), async (req, res) => {
  const { id_usuario, codigo } = req.body;

  try {
    // 1️⃣ Validar OTP
    const cachedOTP = getOTP(id_usuario);

    if (!cachedOTP || cachedOTP !== codigo) {
      return response(res, 'error', 401, 'Código incorrecto o expirado');
    }

    deleteOTP(id_usuario);

    // 2️⃣ Obtener usuario
    const { data: usuario, error: usuarioError } = await supabase
      .from("usuario")
      .select("id_usuario, correo, rol")
      .eq("id_usuario", id_usuario)
      .single();

    if (usuarioError || !usuario) {
      return response(res, 'error', 404, 'Usuario no encontrado en el sistema');
    }

    if (usuario.rol == "soporte") {
      usuario.rol = "administrador";
    }

    // 3️⃣ Configuración por rol
    const rolMap = {
      administrador: { tabla: "administrador", campos: ["id_admin", "cargo"] },
      medico: { tabla: "medico", campos: ["id_medico"] },
      paciente: { tabla: "paciente", campos: ["id_paciente"] }
    };

    const config = rolMap[usuario.rol];

    if (!config) {
      return response(res, 'error', 400, 'Rol de usuario inválido o no reconocido');
    }

    // 4️⃣ Obtener datos específicos del rol
    const { data: rolData, error: rolError } = await supabase
      .from(config.tabla)
      .select(config.campos.join(", "))
      .eq("id_usuario", id_usuario)
      .single();

    if (rolError || !rolData) {
      return response(res, 'error', 404, 'Información del perfil no encontrada');
    }

    // 5️⃣ Normalizar id_rol y cargo
    let id_rol;
    let cargo = null;

    if (usuario.rol === "administrador") {
      id_rol = rolData.id_admin;
      cargo = rolData.cargo;
    } else if (usuario.rol === "medico") {
      id_rol = rolData.id_medico;
    } else {
      id_rol = rolData.id_paciente;
    }

    // 6️⃣ Permisos (solo admin por ahora)
    let permisos = [];

    if (usuario.rol === "administrador") {
      const { data: permisosData } = await supabase
        .from("admin_permiso")
        .select("permiso(nombre)")
        .eq("id_admin", id_rol);

      permisos = permisosData?.map(p => p.permiso.nombre) || [];
    }

    // 7️⃣ Generar JWT Token
    const token = generateToken({
      id_usuario: usuario.id_usuario,
      correo: usuario.correo,
      rol: usuario.rol,
      id_rol,
      permisos
    });

    // 8️⃣ Establecer Cookie de seguridad
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 5 * 60 * 60 * 1000 // 5 horas
    });

    // 9️⃣ Respuesta final estandarizada
    return response(res, 'success', 200, 'Autenticación exitosa', {
      usuario: {
        id_usuario: usuario.id_usuario,
        rol: usuario.rol,
        id_rol,
        ...(cargo ? { cargo } : {}), // 👈 SOLO ADMIN
        permisos
      }
    });

  } catch (error) {
    console.error("Error en verify-otp:", error.message);
    return response(res, 'error', 500, 'Error interno del servidor durante la verificación', error.message);
  }
});


app.put('/usuario/:id_usuario/password', async (req, res) => {
  const { id_usuario } = req.params;
  const { contrasena } = req.body;

  const validacion = esContrasenaRobusta(contrasena);
  if (!validacion.valida) {
    return res.status(400).json({ error: validacion.mensaje });
  }

  try {
    const { data: usuario, error: userError } = await supabase
      .from('usuario')
      .select('contrasena')
      .eq('id_usuario', id_usuario)
      .single();

    if (userError || !usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const { data: historial } = await supabase
      .from('historial_contrasena')
      .select('contrasena_hash')
      .eq('usuario_id_usuario', id_usuario);

    let hashUsado = false;
    if (historial && historial.length > 0) {
      for (let rec of historial) {
        if (await bcrypt.compare(String(contrasena), rec.contrasena_hash)) {
          hashUsado = true; break;
        }
      }
    }
    if (!hashUsado) {
      hashUsado = await bcrypt.compare(String(contrasena), usuario.contrasena);
    }

    if (hashUsado) {
      return res.status(400).json({ error: 'La contraseña no puede ser igual a una utilizada anteriormente.' });
    }

    // Hashear la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    await supabase.from('historial_contrasena').insert({
      usuario_id_usuario: id_usuario,
      contrasena_hash: hashedPassword
    });

    // Actualizar en Supabase
    const { data, error } = await supabase
      .from('usuario')
      .update({
        contrasena: hashedPassword,
        fecha_cambio_contrasena: new Date().toISOString(),
        intentos_fallidos: 0,
        bloqueado_hasta: null
      })
      .eq('id_usuario', id_usuario)
      .select('id_usuario, nombre_completo, correo');

    if (error) {
      throw error;
    }

    res.json({ message: 'Contraseña actualizada correctamente.', usuario: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});






const solicitudRoutes = require('./src/routes/solicitud.routes');
app.use('/api/solicitudes', solicitudRoutes);

const medicoRoutes = require('./src/routes/medico.routes');
app.use('/api/medicos', medicoRoutes);

const pacienteRoutes = require('./src/routes/pacientes.routes');
app.use('/api/pacientes', pacienteRoutes);

const adminRoutes = require('./src/routes/admin.routes');
app.use('/api/administradores', adminRoutes);

const registroRoutes = require('./src/routes/registro.routes');
app.use('/api/registro', registroRoutes);

const generalRoutes = require('./src/routes/general.routes');
app.use('/api/general', generalRoutes);

const pdfRoute = require('./src/routes/patientPDF.routes');
const { loginAuth } = require('./src/controllers/auth.controller');
const securityRoutes = require('./src/routes/security.routes');
app.use("/api", pdfRoute);
app.use("/api/seguridad", securityRoutes);


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});