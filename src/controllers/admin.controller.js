const supabase = require('../../database'); // tu cliente Supabase
const bcrypt=require('bcrypt')

const medicosActivos = async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_medicos_activos');
    if (error) throw error;
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};

const medicosSolicitantes = async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_medicos_solicitantes');
    if (error) {
      console.error('Error ejecutando función:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  } 
};

const activarMedico = async (req, res) => {
  const idMedico = req.params.idMedico;
  const { idAdmin } = req.body;

  if (!idAdmin) {
    return res.status(400).json({ error: 'No hay administrador' });
  }
  console.log('BODY:', req.body);
console.log('PARAMS:', req.params);
  try {
    const { data: medicoData, error: medicoError } = await supabase
      .from('medico')
      .select('id_usuario')
      .eq('id_medico', idMedico)
      .single();

    if (medicoError || !medicoData) {
      return res.status(404).json({ error: 'Médico no encontrado' });
    }

    const idUsuario = medicoData.id_usuario;

    const { error: updateErrorMedico } = await supabase
      .from('medico')
      .update({
        administrador_id_admin: idAdmin
      })
      .eq('id_medico', idMedico);

    if (updateErrorMedico) {
      return res.status(400).json({ error: updateErrorMedico.message });
    }

    const { error: updateErrorUsuario } = await supabase
      .from('usuario')
      .update({ estado: true })
      .eq('id_usuario', idUsuario);

    if (updateErrorUsuario) {
      return res.status(400).json({ error: updateErrorUsuario.message });
    }

    res.json({ mensaje: 'Usuario activado correctamente' });

  } catch (err) {
    res.status(500).json({
      error: 'Error del servidor',
      detalles: err.message
    });
  }
};

const pacientesActivos=async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('obtener_pacientes_activos')

    if (error) {
      console.error('Error ejecutando función:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json(data) // ✅ devuelve arreglo JSON
  } catch (err) {
    console.error('Error interno:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
};


const pacientesSolicitantes=async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('obtener_pacientes_solicitantes')

    if (error) {
      console.error('Error ejecutando función:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json(data) // ✅ devuelve arreglo JSON
  } catch (err) {
    console.error('Error interno:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
};




const activarPaciente= async (req, res) => {
  const idPaciente = req.params.idPaciente;
    const { idAdmin } = req.body;
    if (!idAdmin) {
    return res.status(400).json({ error: 'No hay administrador' });
  }
  try {
    // 1. Obtener id_usuario desde medico
    const { data: pacienteData, error: pacienteError } = await supabase
      .from('paciente')
      .select('id_usuario')
      .eq('id_paciente', idPaciente)
      .single();

    if (pacienteError) {
      return res.status(400).json({ error: medicoError.message });
    }

    if (!pacienteData) {
      return res.status(404).json({ error: 'Medico no encontrado' });
    }

    const idUsuario = pacienteData.id_usuario;
    const { error: updateErrorPaciente } = await supabase
      .from('paciente')
      .update({
        administrador_id_admin: idAdmin
      })
      .eq('id_paciente', idPaciente);

    if (updateErrorPaciente) {
      return res.status(400).json({ error: updateErrorPaciente.message });
    }
    // 2. Actualizar estado del usuario
    const { data: updateData, error: updateError } = await supabase
      .from('usuario')
      .update({ estado: true })
      .eq('id_usuario', idUsuario);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ mensaje: 'Usuario activado correctamente', usuario: updateData });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor', detalles: err.message });
  }
};


const perfilAdmin= async (req, res) => {
  try {
    const idUsuario = parseInt(req.params.idUsuario);

    const { data, error } = await supabase.rpc('obtener_admin_por_usuario', {
      id_usuario_input: idUsuario
    });

    if (error) {
      console.error('Error ejecutando función:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontró el administrador' });
    }

    return res.status(200).json(data[0]); // devuelve el objeto directamente
  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};



const agregarAdmin=async(req,res)=>{
 
    const {
      nombre,
      correo,
      contrasena,
      fechaNacimiento,
      telefono,
      cargo,
      fecha_registro,
      administrador_id_admin
    }=req.body;
    if(!nombre|| !correo ||!contrasena || !fechaNacimiento|| !cargo||!fecha_registro ||!telefono||!administrador_id_admin){
      return res.status(400).json({ error: 'Todos los campos deben ser llenados' });
    }
    try{
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(contrasena, saltRounds);
      const {data, error}=await supabase.
      from('usuario')
      .insert([
                {
                    nombre_completo:nombre,
                    correo:correo,
                    contrasena: hashedPassword,
                    rol:'administrador',
                    fecha_nac:fechaNacimiento,
                    teléfono:telefono,
                    estado:true,
                    
                },
            ]).select();
            if( error) throw error;
             const usuario_insertado = data[0];

             const { data: adminData, error: adminError } = await supabase
            .from("administrador")
            .insert([
                {
                    id_usuario: usuario_insertado.id_usuario,
                    cargo:cargo,
                    fecha_ingreso:fecha_registro,
                    administrador_id_admin:administrador_id_admin
                }
            ]).select();
            if(adminError) throw adminError;
           
            res.status(200).json({
            message: 'Usuario y admin registrados correctamente',
            usuario_insertado,
            adminData
            }); 
    }catch(error){
      console.error("Error al insertar los datos: ", error.message);
      res.status(500).json({ error: error.message });
    }
}


const obtenerAdmins=async(req,res)=>{
  try{
  const id_admin=parseInt(req.params.idAdmin);
  const { data, error } = await supabase.rpc('obtener_admins_visible', {
      id_admin_input: id_admin
    });

    if (error) {
      console.error('Error ejecutando función:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontraron administradores' });
    }

    return res.status(200).json(data); // devuelve el objeto directamente
  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  
  }
}






module.exports={medicosActivos,medicosSolicitantes,activarMedico,pacientesActivos,pacientesSolicitantes,activarPaciente,perfilAdmin,agregarAdmin,obtenerAdmins};