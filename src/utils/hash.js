import bcrypt from 'bcrypt';
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
export const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};
