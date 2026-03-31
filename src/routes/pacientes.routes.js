const express = require('express');
const router = express.Router();
const multer=require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }  });

const {perfilPaciente,registrosPaciente,registrarGlucosa,registrarPaciente,actualizarPaciente,obtenerSemanasEmbarazoActual}=require('../controllers/paciente.controller');
const auditoriaPaciente=require("../middlewares/auditoria.paciente")
router.get('/perfil/:idPaciente',auditoriaPaciente,perfilPaciente);
router.get('/registros/:idPaciente',auditoriaPaciente,registrosPaciente);

router.post('/registrarGlucosa',auditoriaPaciente,registrarGlucosa);
router.post('/registrarPaciente', upload.fields([
  { name: "foto_perfil", maxCount: 1 }
]),registrarPaciente);


router.put('/actualizarPaciente/:id_usuario',auditoriaPaciente,actualizarPaciente)

router.get('/obtenerDatosEmbarazo/:id_paciente',obtenerSemanasEmbarazoActual);
/*
router.get('/activos',pacientesActivos);
router.get('/solicitantes',pacientesSolicitantes)

router.put('/activar/:idPaciente',activarPaciente)*/

module.exports=router;