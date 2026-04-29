const express = require('express');
const router = express.Router();
const multer = require('multer');
const { pacientesActivos, /*pacientesSolicitantes, activarPaciente,*/ medicosActivos, /*medicosSolicitantes, activarMedico,*/
    perfilAdmin, agregarAdmin, obtenerAdmins,/*actualizarPermisosAdmins,*/obtenerRoles,insertarRoles,/*actualizarPermisosPacientes,*/
obtenerRolesPermisos,actualizarMatrizRoles,obtenerSolicitudesPendientes,activarCuenta,suspenderUsuario,reactivarUsuario, 
pacientesCompletos,
medicosCompletos} = require('../controllers/admin.controller');
const auditoriaAdmin = require("../middlewares/auditoria.admin"); 
const verificarToken = require('../utils/verificarToken'); // La funcion para verificar un token
const {getPermisos}=require("../utils/getPermisos");
const verificarPermiso=require("../utils/verifcarPermisos")

router.post('/agregar', verificarToken,getPermisos,verificarPermiso('AGREGAR_ADMIN'), auditoriaAdmin, agregarAdmin);
//router.post('/actualizar-permisos',verificarToken,getPermisos,verificarPermiso('EDITAR_ADMIN'),auditoriaAdmin,actualizarPermisosAdmins)

router.get('/pacientes/activos', verificarToken,getPermisos,verificarPermiso('VER_PACIENTES'), auditoriaAdmin, pacientesActivos); // esta peticion usa la funcion de verificar token
//router.get('/pacientes/solicitantes', verificarToken, getPermisos,verificarPermiso('VER_PACIENTES'),pacientesSolicitantes)
router.get('/obtenerAdmins/:idAdmin',  verificarToken,getPermisos,verificarPermiso('VER_ADMIN'), auditoriaAdmin,obtenerAdmins); // esta no
//router.put('/paciente/activar/:idPaciente', auditoriaAdmin,getPermisos,verificarPermiso('ACEPTAR_SOLICITUD_PACIENTE'),  activarPaciente);
//router.post('/pacientes/actualizarPermisos',verificarToken,auditoriaAdmin,getPermisos,verificarPermiso('EDITAR_ADMIN'),actualizarPermisosPacientes)
router.get('/pacientes/completos',verificarToken,getPermisos,verificarPermiso('VER_ADMIN'), auditoriaAdmin,pacientesCompletos)

router.get('/medicos/activos',  verificarToken,getPermisos,verificarPermiso('VER_MEDICOS'), auditoriaAdmin,medicosActivos);
//router.get('/medicos/solicitantes',verificarToken, getPermisos,verificarPermiso('VER_MEDICOS'),medicosSolicitantes);
router.get('/perfilAdmin/:idUsuario', verificarToken,auditoriaAdmin,getPermisos,verificarPermiso('VER_ADMIN'), perfilAdmin)
//router.put('/medico/activar/:idMedico', verificarToken,getPermisos,verificarPermiso('ACEPTAR_SOLICITUD_MEDICO'), auditoriaAdmin, activarMedico);
router.get('/medicos/completos',verificarToken,getPermisos,verificarPermiso('VER_ADMIN'), auditoriaAdmin,medicosCompletos);


router.patch('/suspender/:id_usuario',verificarToken,getPermisos,verificarPermiso('ELIMINAR_ADMIN'), auditoriaAdmin,suspenderUsuario);
router.patch('/reactivar/:id_usuario',verificarToken,getPermisos,verificarPermiso('ELIMINAR_ADMIN'), auditoriaAdmin,reactivarUsuario);

router.get('/matriz', verificarToken,getPermisos,verificarPermiso('EDITAR_ADMIN'),auditoriaAdmin,obtenerRolesPermisos);
router.put('/actualizarMatriz', verificarToken, getPermisos,verificarPermiso('EDITAR_ADMIN'),auditoriaAdmin, actualizarMatrizRoles);

router.post('/roles',insertarRoles);
router.get('/roles/obtener',obtenerRoles);
router.get('/solicitudes-pendientes',verificarToken,getPermisos,verificarPermiso('ACEPTAR_SOLICITUD'),auditoriaAdmin,  obtenerSolicitudesPendientes);
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint protegido para Soporte
router.put('/activar-cuenta',  upload.fields([
  { name: "foto_perfil", maxCount: 1 },
  { name: "matriculaProfesional", maxCount: 1 },
  { name: "carnetProfesional", maxCount: 1 }
]), verificarToken,getPermisos,verificarPermiso('ACEPTAR_SOLICITUD'),auditoriaAdmin,activarCuenta);

module.exports = router;

