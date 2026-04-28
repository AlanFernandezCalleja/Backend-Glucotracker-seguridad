const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const verifyPassword = async (password, hashedPassword) => {
  const isValid = await bcrypt.compare(String(password), String(hashedPassword));
  if (!isValid) return res.status(401).json({ error: 'Credenciales inválidas' });
};

const generateToken = (usuario) => {
  // Payload: la información pública (no sensible) que viaja en el token
  const payload = {
    id_usuario: usuario.id_usuario,
    correo: usuario.correo,
    rol: usuario.rol, // 
    id_admin: usuario.id_admin
  };

  // Firmamos el token con una expiración (ej. 2 horas)
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '5h' });
};

module.exports = { verifyPassword, generateToken };