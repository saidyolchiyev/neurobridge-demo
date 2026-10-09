import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { corsOrigin } from "../config/cors.js";
export function createSocketServer(httpServer) {
  const io = new Server(httpServer, { cors: { origin: corsOrigin, credentials: true } });
  io.use((socket, next) => { try { socket.user = jwt.verify(socket.handshake.auth?.token || "", process.env.JWT_SECRET); next(); } catch { next(new Error("Sessiya etibarsızdır.")); } });
  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.sub}`);
    socket.on("booking:join", async (bookingId, ack = () => {}) => {
      try { const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { ride: { select: { driverId: true } } } }); if (!booking || booking.status !== "ACCEPTED" || (booking.passengerId !== socket.user.sub && booking.ride.driverId !== socket.user.sub)) return ack({ ok: false, message: "Bu söhbətə giriş icazəniz yoxdur." }); socket.join(`booking:${bookingId}`); ack({ ok: true }); }
      catch { ack({ ok: false, message: "Söhbətə qoşulmaq mümkün olmadı." }); }
    });
  });
  return io;
}
