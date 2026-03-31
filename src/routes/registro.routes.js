const express = require('express');
const router = express.Router();
const {datosParaGlucosa,registrarAlerta}=require('../controllers/registro.controller');
const auditoriaPaciente=require("../middlewares/auditoria.paciente")
router.get('/datosGlucosa/:idUsuario',datosParaGlucosa);

router.post('/registrarAlerta', auditoriaPaciente,registrarAlerta);
module.exports=router;