// middleware/verificarToken.js
const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // Primero intentar obtener token desde cookie
    let token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'No se proporcionó token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
};

module.exports = verificarToken;