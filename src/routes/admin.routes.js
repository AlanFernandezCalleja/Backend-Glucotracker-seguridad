const express = require('express');
const router = express.Router();
const multer = require('multer');
const { pacientesActivos, pacientesSolicitantes, activarPaciente, medicosActivos, medicosSolicitantes, activarMedico,
    perfilAdmin, agregarAdmin, obtenerAdmins,actualizarPermisosAdmins,obtenerRoles,insertarRoles,actualizarPermisosPacientes,
obtenerRolesPermisos,actualizarMatrizRoles,obtenerSolicitudesPendientes,activarCuenta } = require('../controllers/admin.controller');
const auditoriaAdmin = require("../middlewares/auditoria.admin"); 
const verificarToken = require('../utils/verificarToken'); // La funcion para verificar un token
const {getPermisos}=require("../utils/getPermisos");
const verificarPermiso=require("../utils/verifcarPermisos")

router.post('/agregar', verificarToken,getPermisos,verificarPermiso('AGREGAR_ADMIN'), auditoriaAdmin, agregarAdmin);
router.post('/actualizar-permisos',verificarToken,getPermisos,verificarPermiso('EDITAR_ADMIN'),auditoriaAdmin,actualizarPermisosAdmins)

router.get('/pacientes/activos',  pacientesActivos); // esta peticion usa la funcion de verificar token
router.get('/pacientes/solicitantes', verificarToken, getPermisos,verificarPermiso('VER_PACIENTES'),pacientesSolicitantes)
router.get('/obtenerAdmins/:idAdmin', verificarToken,auditoriaAdmin,getPermisos,verificarPermiso('VER_ADMIN'), obtenerAdmins); // esta no
router.put('/paciente/activar/:idPaciente', auditoriaAdmin,getPermisos,verificarPermiso('ACEPTAR_SOLICITUD_PACIENTE'),  activarPaciente);
router.post('/pacientes/actualizarPermisos',verificarToken,auditoriaAdmin,getPermisos,verificarPermiso('EDITAR_ADMIN'),actualizarPermisosPacientes)


router.get('/medicos/activos',  medicosActivos);
router.get('/medicos/solicitantes',verificarToken, getPermisos,verificarPermiso('VER_MEDICOS'),medicosSolicitantes);
router.get('/perfilAdmin/:idUsuario', verificarToken,auditoriaAdmin,getPermisos,verificarPermiso('VER_ADMIN'), perfilAdmin)
router.put('/medico/activar/:idMedico', verificarToken,getPermisos,verificarPermiso('ACEPTAR_SOLICITUD_MEDICO'), auditoriaAdmin, activarMedico);



router.get('/matriz', obtenerRolesPermisos);
router.put('/actualizarMatriz', verificarToken, actualizarMatrizRoles);

router.post('/roles',insertarRoles);
router.get('/roles/obtener',obtenerRoles);
router.get('/solicitudes-pendientes',  obtenerSolicitudesPendientes);
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint protegido para Soporte
router.put('/activar-cuenta',  upload.fields([
  { name: "foto_perfil", maxCount: 1 },
  { name: "matriculaProfesional", maxCount: 1 },
  { name: "carnetProfesional", maxCount: 1 }
]), activarCuenta);

module.exports = router;

