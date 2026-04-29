// // controllers/authController.js
// const supabase = require('../../database');
// const { verifyPassword, generateToken } = require('../utils/auth');

// const loginPrueba = async (req, res) => {
//     try {
//         const { correo, contrasena } = req.body;

//         const { data: usuarioData, error: usuarioError } = await supabase
//             .from("usuario")
//             .select("id_usuario, correo, contrasena, rol")
//             .eq("correo", correo)
//             .eq("estado", true)
//             .single();

//         if (usuarioError || !usuarioData) {
//             console.log({
//                 fecha: new Date().toISOString(),
//                 endpoint: '/api/login',
//                 metodo: 'POST',
//                 correo,
//                 ip: req.ip,
//                 resultado: 'FALLIDO',
//                 motivo: 'Correo no encontrado'
//             });
//             return res.status(401).json({ error: 'Correo no encontrado' });
//         }
//         const usuario = usuarioData;
        

//         // 2. Verificar la contraseña usando Bcrypt
//         const isValid = await verifyPassword(contrasena, usuario.contrasena);
        

//         // 3. Generar el JWT
//         const token = generateToken(usuario);

//         // Establecer cookie httpOnly con el token
//         res.cookie('token', token, {
//             httpOnly: true,   // No accesible desde JavaScript (protege contra XSS)
//             secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
//             sameSite: 'strict', // Protege contra CSRF
//             maxAge: 8 * 60 * 60 * 1000 // 8 horas (coincide con expiresIn del token)
//         });

//         // 4. Devolver el token al cliente
//         return res.status(200).json({
//             mensaje: 'Inicio de sesión exitoso',
//             token: 'Generado correctamente',
//             usuario: {
//                 id_usuario: usuario.id_usuario,
//                 rol: usuario.rol
//             }
//         });

//     } catch (err) {
//         console.error('Error en login:', err);
//         return res.status(500).json({ error: 'Error interno del servidor' });
//     }
// };

// module.exports = loginPrueba;



//##########################################################################################
//##########################################################################################
//##########################################################################################
//##########################################################################################

// controllers/authController.js
const supabase = require('../../database');
const { verifyPassword, generateToken } = require('../utils/auth');
const { getOTP, deleteOTP, setOTP } = require('../../otpCache');
const { sendEmail } = require('../email/sendEmail')
const { getOtpTemplate } = require('../email/templates')
// Asegúrate de importar tus utilidades de OTP y correos aquí si están en otro archivo
// const { setOTP, getOtpTemplate, sendEmail } = require('../utils/otpUtils');

const loginPrueba = async (req, res) => {
    try {
        const { correo, contrasena } = req.body;

        // 1. Buscar usuario
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
        
        
        // 2. Verificar la contraseña usando Bcrypt
        const isValid = await verifyPassword(contrasena, usuario.contrasena);
        
        const { data: adminData } = await supabase
            .from("administrador")
            .select("id_admin, cargo")
            .eq("id_usuario", usuario.id_usuario)
            .maybeSingle();
        usuario.id_admin=adminData?.id_admin||null;
        // 3. Generar el JWT
        const token = generateToken(usuario);
        cargo_admin=adminData.cargo;
        // Establecer cookie httpOnly con el token
        res.cookie('token', token, {
            httpOnly: true,   // No accesible desde JavaScript (protege contra XSS)
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'strict', // Protege contra CSRF
            maxAge: 8 * 60 * 60 * 1000 
        });

        await sendEmail(usuario.correo, subject, html);

        // 5. Generar el JWT y establecer la Cookie
        // Nota: Le pasamos 'id_rol' al token por si lo necesitas decodificar en el frontend o middlewares
        const token = generateToken({ ...usuario, id_rol });

        res.cookie('token', token, {
            httpOnly: true,   // No accesible desde JavaScript (protege contra XSS)
            secure: false, // Solo HTTPS en producción
            sameSite: 'lax', // Protege contra CSRF
            maxAge: 8 * 60 * 60 * 1000 // 8 horas
        });
        

        // 6. Log de éxito
        console.log({
            fecha: new Date().toISOString(),
            endpoint: '/api/login',
            metodo: 'POST',
            correo,
            id_usuario: usuario.id_usuario,
            id_rol,
            ip: req.ip,
            resultado: 'EXITOSO',
            mensaje: 'Login exitoso, OTP enviado y Token generado'
        });

        // 7. Devolver respuesta al cliente
        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso. OTP enviado al correo. y token generado correctamente',
            usuario: {
                id_usuario: usuario.id_usuario,
                rol: usuario.rol,
                id_rol:usuario.id_admin,
                cargo:cargo_admin
                
            }
        });

    } catch (err) {
        console.error('Error en login:', err);
        console.log({
            fecha: new Date().toISOString(),
            endpoint: '/api/login',
            metodo: 'POST',
            correo: req.body?.correo,
            ip: req.ip,
            resultado: 'FALLIDO',
            motivo: err.message
        });
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = loginPrueba;