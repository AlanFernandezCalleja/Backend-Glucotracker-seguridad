const express = require('express');
const router = express.Router();

const { pacientesActivos, pacientesSolicitantes, activarPaciente, medicosActivos, medicosSolicitantes, activarMedico,
    perfilAdmin, agregarAdmin, obtenerAdmins,actualizarPermisosAdmins,obtenerRoles,insertarRoles,actualizarPermisosPacientes,
obtenerRolesPermisos,actualizarMatrizRoles } = require('../controllers/admin.controller');
const auditoriaAdmin = require("../middlewares/auditoria.admin"); 
const verificarToken = require('../utils/verificarToken'); // La funcion para verificar un token
const {getPermisos}=require("../utils/getPermisos");
const verificarPermiso=require("../utils/verifcarPermisos")

router.post('/agregar',  auditoriaAdmin, agregarAdmin);
router.post('/actualizar-permisos',verificarToken,getPermisos,verificarPermiso('EDITAR_ADMIN'),auditoriaAdmin,actualizarPermisosAdmins)

router.get('/pacientes/activos', verificarToken,getPermisos,verificarPermiso('VER_PACIENTES'), pacientesActivos); // esta peticion usa la funcion de verificar token
router.get('/pacientes/solicitantes', verificarToken, getPermisos,verificarPermiso('VER_PACIENTES'),pacientesSolicitantes)
router.get('/obtenerAdmins/:idAdmin', verificarToken,auditoriaAdmin,getPermisos,verificarPermiso('VER_ADMIN'), obtenerAdmins); // esta no
router.put('/paciente/activar/:idPaciente', auditoriaAdmin,getPermisos,verificarPermiso('ACEPTAR_SOLICITUD_PACIENTE'),  activarPaciente);
router.post('/pacientes/actualizarPermisos',verificarToken,auditoriaAdmin,getPermisos,verificarPermiso('EDITAR_ADMIN'),actualizarPermisosPacientes)


router.get('/medicos/activos', verificarToken,getPermisos,verificarPermiso('VER_MEDICOS'), medicosActivos);
router.get('/medicos/solicitantes',verificarToken, getPermisos,verificarPermiso('VER_MEDICOS'),medicosSolicitantes);
router.get('/perfilAdmin/:idUsuario', verificarToken,auditoriaAdmin,getPermisos,verificarPermiso('VER_ADMIN'), perfilAdmin)
router.put('/medico/activar/:idMedico', verificarToken,getPermisos,verificarPermiso('ACEPTAR_SOLICITUD_MEDICO'), auditoriaAdmin, activarMedico);



router.get('/matriz', obtenerRolesPermisos);
router.put('/actualizarMatriz', verificarToken, actualizarMatrizRoles);

router.post('/roles',insertarRoles);
router.get('/roles/obtener',obtenerRoles);

module.exports = router;

