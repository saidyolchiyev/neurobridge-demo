import { z } from "zod";
import { updateLocation, nearbyDrivers } from "../services/locationService.js";
export const update = async (req,res) => res.json(await updateLocation(req.user.sub,req.user.role,req.body));
export const nearby = async (req,res) => { const q=z.object({latitude:z.coerce.number().min(-90).max(90),longitude:z.coerce.number().min(-180).max(180),radius:z.coerce.number().min(100).max(100000).optional()}).parse(req.query);return res.json(await nearbyDrivers(q.latitude,q.longitude,q.radius)); };
