const express = require('express');
const router = express.Router();

const { pacientesActivos, pacientesSolicitantes, activarPaciente, medicosActivos, medicosSolicitantes, activarMedico,
    perfilAdmin, agregarAdmin, obtenerAdmins,actualizarPermisosAdmins } = require('../controllers/admin.controller');
const auditoriaAdmin = require("../middlewares/auditoria.admin"); 
const verificarToken = require('../utils/verificarToken'); // La funcion para verificar un token
const getPermisos=require("../utils/getPermisos");
const verificarPermiso=require("../utils/verifcarPermisos")

router.post('/agregar', verificarToken,getPermisos,verificarPermiso('EDITAR_ADMIN'), auditoriaAdmin, agregarAdmin);
router.post('/actualizar-permisos',verificarToken,getPermisos,verificarPermiso('EDITAR_ADMIN'),auditoriaAdmin,actualizarPermisosAdmins)

router.get('/pacientes/activos', verificarToken,getPermisos,verificarPermiso('VER_ADMIN'), pacientesActivos); // esta peticion usa la funcion de verificar token
router.get('/pacientes/solicitantes', verificarToken, getPermisos,verificarPermiso('VER_ADMIN'),pacientesSolicitantes)
router.get('/obtenerAdmins/:idAdmin', verificarToken,auditoriaAdmin,getPermisos,verificarPermiso('EDITAR_ADMIN'), obtenerAdmins); // esta no
router.put('/paciente/activar/:idPaciente', auditoriaAdmin,getPermisos,verificarPermiso('AGREGAR_ADMIN'),  activarPaciente)


router.get('/medicos/activos', verificarToken,verificarToken,getPermisos,verificarPermiso('VER_ADMIN'), medicosActivos);
router.get('/medicos/solicitantes',verificarToken, getPermisos,verificarPermiso('VER_ADMIN'),medicosSolicitantes);
router.get('/perfilAdmin/:idUsuario', verificarToken,auditoriaAdmin,getPermisos,verificarPermiso('VER_ADMIN'), perfilAdmin)
router.put('/medico/activar/:idMedico', verificarToken,getPermisos,verificarPermiso('AGREGAR_ADMIN'), auditoriaAdmin, activarMedico);



module.exports = router;

