import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'gedara-dev-secret-change-me';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(roles) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Please sign in.' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (roles && !roles.includes(payload.role)) return res.status(403).json({ error: 'You do not have access to this.' });
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
  };
}
