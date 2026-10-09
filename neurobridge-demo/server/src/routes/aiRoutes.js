import { Router } from "express";
import { parse } from "../controllers/aiController.js";
const router=Router();router.post("/search",parse);
export default router;
