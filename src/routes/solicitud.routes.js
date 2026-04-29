const express = require('express');
const router = express.Router();
const {solicitarRegistro}=require('../controllers/solicitud.controller');

router.post('/solicitarRegistro',solicitarRegistro);
module.exports=router;
