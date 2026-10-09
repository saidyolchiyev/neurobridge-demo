import { z } from "zod";
import { parseTravelIntent } from "../services/aiService.js";
export const parse = async (req,res) => { const input=z.object({text:z.string().min(3).max(1000),cities:z.array(z.string().min(1).max(60)).min(2).max(20),today:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).parse(req.body);return res.json(await parseTravelIntent(input.text,input.cities,input.today)); };
