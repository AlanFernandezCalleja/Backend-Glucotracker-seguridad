const express = require('express');
const router = express.Router();

const {pacientesActivos, pacientesSolicitantes,activarPaciente,medicosActivos,medicosSolicitantes, activarMedico,
    perfilAdmin,agregarAdmin,obtenerAdmins}=require('../controllers/admin.controller');
const auditoriaAdmin=require("../middlewares/auditoria.admin");
const verificarToken = require('../utils/verificarToken');
router.post('/agregar',verificarToken,auditoriaAdmin,agregarAdmin);

router.get('/pacientes/activos',verificarToken, pacientesActivos);
router.get('/pacientes/solicitantes', verificarToken,pacientesSolicitantes)
router.get('/obtenerAdmins/:idAdmin',auditoriaAdmin,obtenerAdmins);
router.put('/paciente/activar/:idPaciente',auditoriaAdmin,activarPaciente)


router.get('/medicos/activos', verificarToken,medicosActivos);
router.get('/medicos/solicitantes',medicosSolicitantes);
router.get('/perfilAdmin/:idUsuario',auditoriaAdmin,perfilAdmin)
router.put('/medico/activar/:idMedico', auditoriaAdmin,activarMedico);



module.exports = router;

