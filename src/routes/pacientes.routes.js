const express = require('express');
const router = express.Router();
const multer=require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }  });

const {perfilPaciente,registrosPaciente,registrarGlucosa,registrarPaciente,actualizarPaciente,obtenerSemanasEmbarazoActual}=require('../controllers/paciente.controller');
const auditoriaPaciente=require("../middlewares/auditoria.paciente")
const {getPermisos}=require("../utils/getPermisos");
const verificarToken = require('../utils/verificarToken'); 
const verificarPermiso=require("../utils/verifcarPermisos")




router.get('/perfil/:idPaciente',verificarToken,getPermisos,verificarPermiso('VER_HISTORIAL_GLUCOSA'),auditoriaPaciente,perfilPaciente);
router.get('/registros/:idPaciente',verificarToken,getPermisos,verificarPermiso('VER_HISTORIAL_GLUCOSA'),auditoriaPaciente,registrosPaciente);

router.post('/registrarGlucosa',verificarToken,getPermisos,verificarPermiso('REGISTRAR_GLUCOSA'),auditoriaPaciente,registrarGlucosa);
router.post('/registrarPaciente', upload.fields([
  { name: "foto_perfil", maxCount: 1 }
]),registrarPaciente);


router.put('/actualizarPaciente/:id_usuario',verificarToken,getPermisos,verificarPermiso('EDITAR_PACIENTE'),auditoriaPaciente,actualizarPaciente)

router.get('/obtenerDatosEmbarazo/:id_paciente',verificarToken,getPermisos,verificarPermiso('EDITAR_PACIENTE'),obtenerSemanasEmbarazoActual);
/*
router.get('/activos',pacientesActivos);
router.get('/solicitantes',pacientesSolicitantes)

router.put('/activar/:idPaciente',activarPaciente)*/

module.exports=router;