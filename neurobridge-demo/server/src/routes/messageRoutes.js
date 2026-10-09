import { Router } from "express";
import * as messages from "../controllers/messageController.js";
import { authenticate } from "../middleware/auth.js";
const router=Router();router.use(authenticate);router.get("/:bookingId",messages.list);router.post("/:bookingId",messages.send);
export default router;
