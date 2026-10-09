import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma.js";

const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), phone: z.string().min(7).max(24), password: z.string().min(8).max(100), role: z.enum(["PASSENGER", "DRIVER"]).default("PASSENGER") });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
function session(user) { const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" }); const { passwordHash, ...safeUser } = user; void passwordHash; return { user: safeUser, token }; }
export async function register(input) {
  const data = registerSchema.parse(input); const passwordHash = await bcrypt.hash(data.password, 12);
  const { password, ...userData } = data;
  const user = await prisma.user.create({ data: { ...userData, email: data.email.toLowerCase(), passwordHash } }); return session(user);
}
export async function login(input) {
  const data = loginSchema.parse(input); const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) { const error = new Error("E-poçt və ya şifrə yanlışdır."); error.status = 401; throw error; }
  return session(user);
}
export async function currentUser(id) { const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, vehicle: true } }); if (!user) { const error = new Error("İstifadəçi tapılmadı."); error.status = 404; throw error; } return user; }
