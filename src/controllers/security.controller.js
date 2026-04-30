const supabase = require('../../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../email/sendEmail');
const { getOtpTemplate, getRecuperacionTemplate, getDesbloqueoTemplate } = require('../email/templates');
const { setOTP, getOTP, deleteOTP } = require('../../otpCache');
const { esContrasenaRobusta } = require('../utils/security');

// 1. Solicitar recuperación de contraseña (envía OTP)
const solicitarRecuperacion = async (req, res) => {
    const { correo } = req.body;
    try {
        const { data: usuario, error } = await supabase
            .from("usuario")
            .select("id_usuario, correo")
            .eq("correo", correo)
            .single();

        if (error || !usuario) {
            // Retornamos 200 aunque no exista para no revelar cuentas, o 404. Usaré 404 por simplicidad en este backend.
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setOTP(`recuperacion_${usuario.correo}`, otp, 10 * 60 * 1000); // 10 min

        const { subject, html } = getRecuperacionTemplate({
            nombreUsuario: usuario.correo,
            codigo: otp
        });

        await sendEmail(usuario.correo, `Recuperación de contraseña - ${subject}`, html);

        res.status(200).json({ message: 'Correo de recuperación enviado.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 1.5 Verificar código OTP y emitir JWT
const verificarCodigoRecuperacion = async (req, res) => {
    const { correo, codigo } = req.body;
    try {
        const cachedOTP = getOTP(`recuperacion_${correo}`);
        if (!cachedOTP || cachedOTP !== codigo) {
            return res.status(400).json({ error: 'Código inválido o expirado.' });
        }

        // Eliminar OTP para que no se use de nuevo
        deleteOTP(`recuperacion_${correo}`);

        // Generar JWT temporal (15 min)
        const token = jwt.sign(
            { correo, tipo: 'recuperacion' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.status(200).json({ message: 'Código verificado exitosamente.', token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// 2. Cambiar contraseña usando JWT temporal
const cambiarContrasena = async (req, res) => {
    const { nueva_contrasena } = req.body;
    
    // Obtener JWT del header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Se requiere token de autorización.' });
    }

    let correo;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.tipo !== 'recuperacion') {
            return res.status(403).json({ error: 'Token inválido para esta operación.' });
        }
        correo = decoded.correo;
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }

    try {

        // Validar contraseña robusta
        const validacion = esContrasenaRobusta(nueva_contrasena);
        if (!validacion.valida) {
            return res.status(400).json({ error: validacion.mensaje });
        }

        const { data: usuario, error: userError } = await supabase
            .from("usuario")
            .select("id_usuario, contrasena")
            .eq("correo", correo)
            .single();

        if (userError || !usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

        // Verificar historial de contraseñas
        const { data: historial } = await supabase
            .from('historial_contrasena')
            .select('contrasena_hash')
            .eq('usuario_id_usuario', usuario.id_usuario);

        let hashUsado = false;
        if (historial && historial.length > 0) {
            for (let rec of historial) {
                const isMatch = await bcrypt.compare(String(nueva_contrasena), rec.contrasena_hash);
                if (isMatch) {
                    hashUsado = true;
                    break;
                }
            }
        }
        
        // También comparar con la actual por si acaso
        if (!hashUsado) {
           hashUsado = await bcrypt.compare(String(nueva_contrasena), usuario.contrasena);
        }

        if (hashUsado) {
            return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a una utilizada anteriormente.' });
        }

        // Hashear y actualizar
        const hashedPassword = await bcrypt.hash(nueva_contrasena, 10);

        // Guardar en historial
        await supabase.from('historial_contrasena').insert({
            usuario_id_usuario: usuario.id_usuario,
            contrasena_hash: hashedPassword
        });

        // Actualizar usuario
        await supabase.from('usuario').update({
            contrasena: hashedPassword,
            fecha_cambio_contrasena: new Date().toISOString(),
            intentos_fallidos: 0,
            bloqueado_hasta: null
        }).eq('id_usuario', usuario.id_usuario);

        res.status(200).json({ message: 'Contraseña cambiada exitosamente.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. Solicitar desbloqueo de cuenta
const solicitarDesbloqueo = async (req, res) => {
    const { correo } = req.body;
    try {
        const { data: usuario, error } = await supabase
            .from("usuario")
            .select("id_usuario, correo, intentos_fallidos")
            .eq("correo", correo)
            .single();

        if (error || !usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (usuario.intentos_fallidos < 3) {
            return res.status(403).json({ error: 'Tu cuenta ha sido suspendida por un administrador. Contacta a soporte para más información.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setOTP(`desbloqueo_${usuario.correo}`, otp, 15 * 60 * 1000); // 15 min

        const { subject, html } = getDesbloqueoTemplate({
            nombreUsuario: usuario.correo,
            codigo: otp
        });

        await sendEmail(usuario.correo, `Código para desbloquear cuenta - ${subject}`, html);

        res.status(200).json({ message: 'Código de desbloqueo enviado al correo.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno.' });
    }
};

// 4. Confirmar desbloqueo
const confirmarDesbloqueo = async (req, res) => {
    const { correo, codigo } = req.body;
    try {
        const cachedOTP = getOTP(`desbloqueo_${correo}`);
        if (!cachedOTP || cachedOTP !== codigo) {
            return res.status(400).json({ error: 'Código de desbloqueo inválido o expirado.' });
        }

        const { data: usuario } = await supabase.from("usuario").select("id_usuario").eq("correo", correo).single();
        if(!usuario) return res.status(404).json({error: 'Usuario no encontrado'});

        deleteOTP(`desbloqueo_${correo}`);

        await supabase.from('usuario').update({
            intentos_fallidos: 0,
            estado: true
        }).eq('id_usuario', usuario.id_usuario);

        res.status(200).json({ message: 'Cuenta desbloqueada exitosamente.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno.' });
    }
};

module.exports = {
    solicitarRecuperacion,
    verificarCodigoRecuperacion,
    cambiarContrasena,
    solicitarDesbloqueo,
    confirmarDesbloqueo
};
