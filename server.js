
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
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
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


app.post('/api/prueba/login', loginPrueba)

app.post('/api/login', auditoriaEndpoint(), async (req, res) => {
  const { correo, contrasena } = req.body;

  // Buscar usuario
  const { data: usuarioData, error: usuarioError } = await supabase
    .from("usuario")
    .select("id_usuario, correo, contrasena, rol, intentos_fallidos, bloqueado_hasta, fecha_cambio_contrasena")
    .eq("correo", correo)
    .eq("estado", true)
    .single();

  if (usuarioError || !usuarioData) {
    console.log({
      fecha: new Date().toISOString(),
      endpoint: '/api/login',
      metodo: 'POST',
      correo,
      ip: req.ip,
      resultado: 'FALLIDO',
      motivo: 'Correo no encontrado'
    });
    return res.status(401).json({ error: 'Correo no encontrado' });
  }

  const usuario = usuarioData;

  // Verificar si la cuenta está bloqueada
  if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
    console.log({
      fecha: new Date().toISOString(),
      endpoint: '/api/login',
      metodo: 'POST',
      correo,
      ip: req.ip,
      resultado: 'FALLIDO',
      motivo: 'Cuenta bloqueada'
    });
    return res.status(403).json({ error: 'Cuenta bloqueada por múltiples intentos fallidos. Solicita el desbloqueo por correo.' });
  }
  const rolMap = { 
    administrador: 'id_admin', 
    paciente: 'id_paciente', 
    medico: 'id_medico' 
  };
  const rolB = rolMap[usuario.rol];
  const { data: rolData, error: rolError } = await supabase
    .from(usuario.rol)
    .select(rolB)
    .eq("id_usuario", usuario.id_usuario)
    .single();

  if (rolError || !rolData) {
    console.log({
      fecha: new Date().toISOString(),
      endpoint: '/api/login',
      metodo: 'POST',
      correo,
      ip: req.ip,
      resultado: 'FALLIDO',
      motivo: 'Rol cuenta'
    });
    return res.status(401).json({ error: 'Rol cuenta' })
  };

  const id_rol = rolData[rolB];

  try {
    // Verificar contraseña
    const isMatch = await bcrypt.compare(String(contrasena), usuario.contrasena);
    if (!isMatch) {
      // Incrementar intentos fallidos
      const nuevosIntentos = (usuario.intentos_fallidos || 0) + 1;
      let updateData = { intentos_fallidos: nuevosIntentos };
      if (nuevosIntentos >= 3) {
          // Bloquear cuenta (por 100 años para forzar desbloqueo por correo)
          const fechaDesbloqueo = new Date();
          fechaDesbloqueo.setFullYear(fechaDesbloqueo.getFullYear() + 100);
          updateData.bloqueado_hasta = fechaDesbloqueo.toISOString();
      }
      await supabase.from("usuario").update(updateData).eq("id_usuario", usuario.id_usuario);

      return res.status(401).json({ error: nuevosIntentos >= 3 ? 'Cuenta bloqueada por múltiples intentos fallidos.' : 'Contraseña incorrecta' });
    }

    // Reiniciar intentos fallidos si es exitoso
    if (usuario.intentos_fallidos > 0) {
      await supabase.from("usuario").update({ intentos_fallidos: 0, bloqueado_hasta: null }).eq("id_usuario", usuario.id_usuario);
    }

    // Verificar vigencia (6 meses)
    if (usuario.fecha_cambio_contrasena) {
      const seisMesesAtras = new Date();
      seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
      if (new Date(usuario.fecha_cambio_contrasena) < seisMesesAtras) {
        return res.status(403).json({ 
          error: 'Tu contraseña ha caducado (más de 6 meses). Por favor, actualízala.', 
          code: 'PASSWORD_EXPIRED', 
          id_usuario: usuario.id_usuario 
        });
      }
    }

    // Generar OTPF
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
    setOTP(usuario.id_usuario, otp, 5 * 60 * 1000); // 5 minutos

    // Enviar OTP por correo
    const { subject, html } = getOtpTemplate({
      nombreUsuario: usuario.correo, // o nombre si lo tienes
      codigo: otp
    });

    await sendEmail(
      usuario.correo,
      subject,
      html
    );
    console.log({
      fecha: new Date().toISOString(),
      endpoint: '/api/login',
      metodo: 'POST',
      correo,
      id_usuario: usuario.id_usuario,
      id_rol,
      ip: req.ip,
      resultado: 'EXITOSO',
      mensaje: 'OTP enviado al correo'
    });

    res.status(200).json({ id_usuario: usuario.id_usuario, id_rol: id_rol, message: 'OTP enviado al correo' });
  } catch (error) {
    console.log({
      fecha: new Date().toISOString(),
      endpoint: '/api/login',
      metodo: 'POST',
      correo,
      ip: req.ip,
      resultado: 'FALLIDO',
      motivo: error.message
    });
    res.status(500).json({ error: 'Error interno' });
  }
});


const { getOTP, deleteOTP } = require('./otpCache');

app.post('/api/verify-otp', auditoriaEndpoint(), async (req, res) => {
  const { id_usuario, codigo } = req.body;
  try {
    // Verificar OTP en cache
    const cachedOTP = getOTP(id_usuario);

    if (!cachedOTP || cachedOTP !== codigo) {
      console.log({
        fecha: new Date().toISOString(),
        endpoint: '/api/verify-otp',
        metodo: 'POST',
        id_usuario,
        ip: req.ip,
        resultado: 'FALLIDO',
        motivo: 'Código incorrecto o expirado'
      });
      return res.status(401).json({ error: 'Código incorrecto o expirado' });
    }

    // OTP correcto: eliminar de cache
    deleteOTP(id_usuario);

    // Obtener datos completos de usuario y rol
    const { data: usuarioData, error: usuarioError } = await supabase
      .from("usuario")
      .select("id_usuario, rol")
      .eq("id_usuario", id_usuario)
      .single();

    if (usuarioError || !usuarioData) {
      console.log({
        fecha: new Date().toISOString(),
        endpoint: '/api/verify-otp',
        metodo: 'POST',
        id_usuario,
        ip: req.ip,
        resultado: 'FALLIDO',
        motivo: 'Usuario no encontrado'
      });
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    let id_rol = 0;
    const rol = usuarioData.rol;

    if (rol === "administrador") {
      const { data: adminData } = await supabase
        .from("administrador")
        .select("id_admin")
        .eq("id_usuario", id_usuario)
        .single();
      id_rol = adminData.id_admin;
    } else if (rol === "medico") {
      const { data: medicoData } = await supabase
        .from("medico")
        .select("id_medico")
        .eq("id_usuario", id_usuario)
        .single();
      id_rol = medicoData.id_medico;
    } else {
      const { data: pacienteData } = await supabase
        .from("paciente")
        .select("id_paciente")
        .eq("id_usuario", id_usuario)
        .single();
      id_rol = pacienteData.id_paciente;
    }
    console.log({
      fecha: new Date().toISOString(),
      endpoint: '/api/verify-otp',
      metodo: 'POST',
      id_usuario,
      rol,
      id_rol,
      ip: req.ip,
      resultado: 'EXITOSO',
      mensaje: 'Login exitoso'
    });
    res.status(200).json({
      id_usuario,
      rol,
      id_rol,
      message: 'Login exitoso'
    });
  } catch (error) {
    console.log({
      fecha: new Date().toISOString(),
      endpoint: '/api/verify-otp',
      metodo: 'POST',
      id_usuario,
      ip: req.ip,
      resultado: 'FALLIDO',
      motivo: error.message
    });
    res.status(500).json({ error: 'Error interno' });
  }
});


const { esContrasenaRobusta } = require('./src/utils/security');
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