import { z } from "zod";
import { prisma } from "../config/prisma.js";
const contentSchema = z.object({ content: z.string().trim().min(1).max(2000) });
async function authorize(bookingId, userId) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { ride: { select: { driverId: true } } } });
  if (!booking || booking.status !== "ACCEPTED" || (booking.passengerId !== userId && booking.ride.driverId !== userId)) { const e = new Error("Bu söhbətə giriş icazəniz yoxdur."); e.status = 403; throw e; }
  return booking;
}
export async function listMessages(bookingId, userId) { await authorize(bookingId, userId); return prisma.message.findMany({ where: { bookingId }, include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" }, take: 300 }); }
export async function sendMessage(bookingId, userId, input) {
  const booking = await authorize(bookingId, userId);
  const { content } = contentSchema.parse(input);
  const message = await prisma.message.create({ data: { bookingId, senderId: userId, content }, include: { sender: { select: { id: true, name: true } } } });
  const recipientId = booking.passengerId === userId ? booking.ride.driverId : booking.passengerId;
  return { message, recipientId };
}
