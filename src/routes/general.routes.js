const express = require('express');
const router = express.Router();

const {verMomentos, verNiveles, verEnfermedades, verTratamientos,verEspecialidades, verAuditoria}=require('../controllers/general.controller');
router.get('/momentos',verMomentos);
router.get('/niveles',verNiveles);
router.get('/enfermedades',verEnfermedades);
router.get('/tratamientos',verTratamientos);
router.get('/especialidades',verEspecialidades);
router.get('/auditoria', verAuditoria);

module.exports=router;