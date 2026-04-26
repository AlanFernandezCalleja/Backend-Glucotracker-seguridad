// controllers/authController.js
const supabase = require('../../database');
const { verifyPassword, generateToken } = require('../utils/auth');

const loginPrueba = async (req, res) => {
    try {
        const { correo, contrasena } = req.body;

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
        

        // 2. Verificar la contraseña usando Bcrypt
        const isValid = await verifyPassword(contrasena, usuario.contrasena);
        

        // 3. Generar el JWT
        const token = generateToken(usuario);

        // Establecer cookie httpOnly con el token
        res.cookie('token', token, {
            httpOnly: true,   // No accesible desde JavaScript (protege contra XSS)
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'strict', // Protege contra CSRF
            maxAge: 8 * 60 * 60 * 1000 // 8 horas (coincide con expiresIn del token)
        });

        // 4. Devolver el token al cliente
        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            token: 'Generado correctamente',
            usuario: {
                id_usuario: usuario.id_usuario,
                rol: usuario.rol
            }
        });

    } catch (err) {
        console.error('Error en login:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = loginPrueba;