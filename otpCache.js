// otpCache.js
const otpMap = new Map(); // id_usuario => { codigo, expiracion }

const setOTP = (id_usuario, codigo, expiresInMs = 5 * 60 * 1000) => {
  const expiracion = Date.now() + expiresInMs;
  otpMap.set(id_usuario, { codigo, expiracion });
};

const getOTP = (id_usuario) => {
  const data = otpMap.get(id_usuario);
  if (!data) return null;

  // Verificar expiración
  if (Date.now() > data.expiracion) {
    otpMap.delete(id_usuario);
    return null;
  }

  return data.codigo;
};

const deleteOTP = (id_usuario) => {
  otpMap.delete(id_usuario);
};

module.exports = { setOTP, getOTP, deleteOTP };
