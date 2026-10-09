import { Router } from "express";
import * as bookings from "../controllers/bookingController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
const router=Router();
router.use(authenticate);router.post("/quote",requireRole("PASSENGER"),bookings.quote);router.post("/",requireRole("PASSENGER"),bookings.request);router.get("/me",bookings.mine);router.patch("/consents/:id",requireRole("PASSENGER"),bookings.consent);router.patch("/:id/accept",requireRole("DRIVER"),bookings.accept);router.patch("/:id/reject",requireRole("DRIVER"),bookings.reject);
export default router;
