const bcrypt = require('bcrypt');
const supabase = require('../../database'); // Ajusta la ruta a tu conexión

const solicitarRegistro = async (req, res) => {
  const { nombre, correo, contrasena, fechaNac, telefono } = req.body;

  // 1. Validación básica de campos vacíos
  if (!nombre || !correo || !contrasena || !fechaNac || !telefono) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // 2. Encriptamos la contraseña por seguridad
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    // 3. Insertamos el "cascarón" en la tabla usuario
    // Nota: Mapeamos 'telefono' (body) a 'teléfono' (columna exacta de tu BD)
    const { data, error } = await supabase
      .from('usuario')
      .insert([
        {
          nombre_completo: nombre,
          correo: correo,
          contrasena: hashedPassword,
          fecha_nac: fechaNac,
          teléfono: telefono,
          estado: false,       // 🔴 IMPORTANTE: Cuenta inactiva por defecto
          rol: 'pendiente'     // Etiqueta informativa para saber que aún no es paciente ni médico
        }
      ])
      .select();

    if (error) {
      // 4. Manejo de error si el correo ya está registrado (Violación de restricción UNIQUE)
      if (error.code === '23505') {
        return res.status(409).json({ error: 'El correo electrónico ya se encuentra registrado' });
      }
      throw error;
    }

    // 5. Respuesta exitosa
    res.status(201).json({ 
      message: 'Solicitud registrada correctamente. Pendiente de validación por Soporte.',
      usuario_id: data[0].id_usuario // Retornamos el ID por si lo necesitas a futuro
    });

  } catch (error) {
    console.error('Error en solicitarRegistro:', error.message);
    res.status(500).json({ error: 'Error interno del servidor al procesar la solicitud' });
  }
};

module.exports = {
  // ... exporta tus otras funciones,
  solicitarRegistro
};