
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
    .select("id_usuario, correo, contrasena, rol")
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
  const rolMap = { 
    administrador: 'id_admin', 
    soporte:'id_admin',
    paciente: 'id_paciente', 
    medico: 'id_medico' 
  };
  if(usuarioData.rol=="soporte"){
    usuarioData.rol="administrador";
  }
  const rolB = rolMap[usuario.rol];
  const { data: rolData, error: rolError } = await supabase
    .from(usuario.rol)
    .select(rolB)
    .eq("id_usuario", usuario.id_usuario);

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
    return res.status(401).json({ error: rolError.message })
  };

  const id_rol = rolData[rolB];

  try {
    // Verificar contraseña
    const isMatch = await bcrypt.compare(String(contrasena), usuario.contrasena);
    if (!isMatch) return res.status(401).json({ error: 'Contraseña incorrecta' });

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
const  {generateToken}  = require('./src/utils/auth');
app.post('/api/verify-otp', auditoriaEndpoint(), async (req, res) => {
  const { id_usuario, codigo } = req.body;

  try {
    // 🔐 validar OTP
    const cachedOTP = getOTP(id_usuario);

    if (!cachedOTP || cachedOTP !== codigo) {
      return res.status(401).json({ error: 'Código incorrecto o expirado' });
    }

    deleteOTP(id_usuario);

    // 👤 obtener usuario
    const { data: usuario, error: usuarioError } = await supabase
      .from("usuario")
      .select("id_usuario, correo, rol")
      .eq("id_usuario", id_usuario)
      .single();

    if (usuarioError || !usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if(usuario.rol=="soporte"){
      usuario.rol="administrador";
    }
    // 🔧 configuración por rol
    const rolMap = {
      administrador: { tabla: "administrador", campos: ["id_admin", "cargo"] },
      medico: { tabla: "medico", campos: ["id_medico"] },
      paciente: { tabla: "paciente", campos: ["id_paciente"] }
    };

    const config = rolMap[usuario.rol];

    if (!config) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    // 🧩 obtener datos del rol
    const { data: rolData, error: rolError } = await supabase
      .from(config.tabla)
      .select(config.campos.join(", "))
      .eq("id_usuario", id_usuario)
      .single();

    if (rolError || !rolData) {
      return res.status(404).json({ error: "Rol no encontrado" });
    }

    // 🎯 normalizar id_rol y cargo
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

    // 🔐 permisos (solo admin por ahora)
    let permisos = [];

    if (usuario.rol === "administrador") {
      const { data: permisosData } = await supabase
        .from("admin_permiso")
        .select("permiso(nombre)")
        .eq("id_admin", id_rol);

      permisos = permisosData?.map(p => p.permiso.nombre) || [];
    }

    // 🎟️ token
    const token = generateToken({
      id_usuario: usuario.id_usuario,
      correo: usuario.correo,
      rol: usuario.rol,
      id_rol,
      permisos
    });

    // 🍪 cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 5 * 60 * 60 * 1000
    });

    // 📤 respuesta final
    res.json({
      message: 'Login exitoso',
      usuario: {
        id_usuario: usuario.id_usuario,
        rol: usuario.rol,
        id_rol,
        ...(cargo ? { cargo } : {}), // 👈 SOLO ADMIN
        permisos
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});
app.put('/usuario/:id_usuario/password', async (req, res) => {
  const { id_usuario } = req.params;
  const { contrasena } = req.body;

  if (!contrasena || contrasena.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    // Hashear la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    // Actualizar en Supabase
    const { data, error } = await supabase
      .from('usuario')
      .update({ contrasena: hashedPassword })
      .eq('id_usuario', id_usuario)
      .select('id_usuario, nombre_completo, correo');

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json({ message: 'Contraseña actualizada correctamente.', usuario: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});






const solicitudRoutes=require('./src/routes/solicitud.routes');
app.use('/api/solicitudes',solicitudRoutes);

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
app.use("/api", pdfRoute);


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});