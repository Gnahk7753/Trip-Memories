import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signIn(res, user) {
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '30d' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 3600 * 1000,
  });
}

export function requireAuth(req, res, next) {
  try {
    req.userId = jwt.verify(req.cookies.token, SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: 'Chưa đăng nhập' });
  }
}
