const express = require('express');
const router = express.Router();
const { 
    solicitarRecuperacion, 
    cambiarContrasena, 
    solicitarDesbloqueo, 
    confirmarDesbloqueo 
} = require('../controllers/security.controller');

// Recuperación de contraseña
router.post('/recuperar-contrasena', solicitarRecuperacion);
router.post('/cambiar-contrasena', cambiarContrasena);

// Desbloqueo de cuenta
router.post('/solicitar-desbloqueo', solicitarDesbloqueo);
router.post('/confirmar-desbloqueo', confirmarDesbloqueo);

module.exports = router;
