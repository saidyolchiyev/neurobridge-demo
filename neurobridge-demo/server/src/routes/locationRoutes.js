import { Router } from "express";
import * as location from "../controllers/locationController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
const router=Router();router.post("/update",authenticate,requireRole("DRIVER"),location.update);router.get("/nearby",location.nearby);
export default router;
