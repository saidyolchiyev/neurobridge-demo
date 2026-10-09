import { Router } from "express";
import * as rides from "../controllers/rideController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
const router=Router();
router.get("/",rides.list);router.get("/nearby",rides.nearby);router.post("/match",rides.match);router.post("/",authenticate,requireRole("DRIVER"),rides.create);router.get("/:id/route",rides.route);router.get("/:id",rides.get);router.patch("/:id",authenticate,rides.update);
export default router;
