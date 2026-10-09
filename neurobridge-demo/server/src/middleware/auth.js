import jwt from "jsonwebtoken";
export function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Giriş tələb olunur." });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ message: "Sessiya etibarsızdır." }); }
}
export const requireRole = (...roles) => (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ message: "Bu əməliyyata icazəniz yoxdur." });
