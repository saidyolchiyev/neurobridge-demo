import * as messageService from "../services/messageService.js";
export const list = async (req,res) => res.json(await messageService.listMessages(req.params.bookingId,req.user.sub));
export const send = async (req,res) => { const { message, recipientId }=await messageService.sendMessage(req.params.bookingId,req.user.sub,req.body);const io=req.app.get("io");io.to(`booking:${req.params.bookingId}`).emit("message:new",message);io.to(`user:${recipientId}`).emit("message:unread",message);return res.status(201).json(message); };
