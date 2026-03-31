const express = require('express');
const router = express.Router();

const {pacientesActivos, pacientesSolicitantes,activarPaciente,medicosActivos,medicosSolicitantes, activarMedico,
    perfilAdmin,agregarAdmin,obtenerAdmins}=require('../controllers/admin.controller');
const auditoriaAdmin=require("../middlewares/auditoria.admin")
router.post('/agregar',auditoriaAdmin,agregarAdmin);

router.get('/pacientes/activos',pacientesActivos);
router.get('/pacientes/solicitantes',pacientesSolicitantes)
router.get('/obtenerAdmins/:idAdmin',auditoriaAdmin,obtenerAdmins);
router.put('/paciente/activar/:idPaciente',auditoriaAdmin,activarPaciente)


router.get('/medicos/activos', medicosActivos);
router.get('/medicos/solicitantes',medicosSolicitantes);
router.get('/perfilAdmin/:idUsuario',auditoriaAdmin,perfilAdmin)
router.put('/medico/activar/:idMedico', auditoriaAdmin,activarMedico);



module.exports = router;

