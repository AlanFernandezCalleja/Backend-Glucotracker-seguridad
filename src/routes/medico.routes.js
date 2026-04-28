const express = require('express');
const router = express.Router();
const multer = require('multer');

// ✅ Definir storage en memoria


const { 
  registrarMedico, 
  verMedicos, 
  medicosActivos, 
  medicosSolicitantes, 
  activarMedico,
  perfilMedico, 
  verPacientes, 
  alertasActivas, 
  alertasResueltas, 
  retroalimentacionAlerta,
  registrarGlucosaMedico, 
  actualizarMedico 
} = require('../controllers/medico.controller');

const auditoriaMedico = require("../middlewares/auditoria.medico")

const {getPermisos}=require("../utils/getPermisos");
const verificarToken = require('../utils/verificarToken'); 
const verificarPermiso=require("../utils/verifcarPermisos")
const storage = multer.memoryStorage();
const upload = multer({ storage });
router.post('/registrar', upload.fields([
  { name: "matriculaProfesional", maxCount: 1 },
  { name: "carnetProfesional", maxCount: 1 },
]), registrarMedico);

router.post('/responder/alerta', auditoriaMedico, retroalimentacionAlerta);
router.post('/registrar/glucosa', verificarToken,getPermisos,verificarPermiso('REGISTRAR_GLUCOSA'),auditoriaMedico, registrarGlucosaMedico)
router.get('/perfil/:idUsuario',verificarToken,getPermisos,verificarPermiso('VER_HISTORIAL_GLUCOSA'), auditoriaMedico, perfilMedico);
router.get('/ver', verMedicos);
router.get('/misPacientes/:idMedico', verificarToken,getPermisos,verificarPermiso('VER_HISTORIAL_GLUCOSA'),auditoriaMedico, verPacientes);
router.get('/alertasActivas/:idMedico',verificarToken,getPermisos,verificarPermiso('VER_ALERTA'), auditoriaMedico, alertasActivas);
router.get('/alertasResueltas/:idMedico', verificarToken,getPermisos,verificarPermiso('VER_ALERTA'),auditoriaMedico, alertasResueltas);
router.put('/actualizar/:id_medico', verificarToken,getPermisos,verificarPermiso('EDITAR_MEDICO'),auditoriaMedico,   upload.single('carnet'), actualizarMedico);

module.exports = router;
