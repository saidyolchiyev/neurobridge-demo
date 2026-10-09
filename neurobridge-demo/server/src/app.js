import "dotenv/config";
import express from "express";
import http from "node:http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { prisma } from "./config/prisma.js";
import { corsOrigin } from "./config/cors.js";
import { createSocketServer } from "./sockets/index.js";
import authRoutes from "./routes/authRoutes.js";
import rideRoutes from "./routes/rideRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET ən azı 32 simvol olmalıdır.");
const app=express();const server=http.createServer(app);const io=createSocketServer(server);app.set("io",io);app.set("trust proxy",1);
app.use(helmet());app.use(cors({origin:corsOrigin,credentials:true}));app.use(express.json({limit:"64kb"}));
app.use("/api",rateLimit({windowMs:60_000,limit:120,standardHeaders:"draft-8",legacyHeaders:false}));
app.get("/api/health",(_req,res)=>res.json({status:"ok",mode:"api"}));
app.use("/api/auth",authRoutes);app.use("/api/rides",rideRoutes);app.use("/api/bookings",bookingRoutes);app.use("/api/messages",messageRoutes);app.use("/api/locations",locationRoutes);app.use("/api/ai",aiRoutes);
const clientDist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../dist");
const clientIndex=path.join(clientDist,"index.html");
if(existsSync(clientIndex)){
  app.use(express.static(clientDist,{index:false,fallthrough:true,maxAge:"1h"}));
  app.get(/^(?!\/(?:api|socket\.io)(?:\/|$)).*/,(_req,res)=>res.sendFile(clientIndex));
}
app.use((error,_req,res,_next)=>{const duplicate=error.code==="P2002";const status=error.status||(error instanceof z.ZodError?400:duplicate?409:500);if(status===500)console.error(error.message);const message=status===500?"Daxili server xətası.":duplicate?"Bu e-poçt artıq qeydiyyatdadır.":error.message;res.status(status).json({message,...(error instanceof z.ZodError?{details:error.issues.map((issue)=>({path:issue.path.join("."),message:issue.message}))}:{})})});
const port=Number(process.env.PORT||4000);server.listen(port,"0.0.0.0",()=>console.log(`YolYoldaş API ${port} portunda işləyir.`));
const shutdown=async()=>{io.close();server.close();await prisma.$disconnect();process.exit(0)};process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);
