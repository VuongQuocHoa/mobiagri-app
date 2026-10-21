const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const getSecret = () => {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('JWT_SECRET is required in production.');
  return process.env.JWT_SECRET || 'development-only-change-this-secret';
};
const signToken = (user) => jwt.sign({ sub: user.id, email: user.email, role: user.role, name: user.name }, getSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
  return res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};

const register = async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (name.length < 2) return res.status(400).json({ message: 'Vui lòng nhập họ tên hợp lệ.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Email không hợp lệ.' });
  if (password.length < 8) return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự.' });
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(409).json({ message: 'Email này đã được đăng ký.' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, email, passwordHash, role: 'member' } });
  return res.status(201).json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};

const me = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { id: true, name: true, email: true, role: true } });
  if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
  return res.json({ user });
};

module.exports = { login, register, me };
