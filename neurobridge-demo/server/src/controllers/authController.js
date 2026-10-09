import * as authService from "../services/authService.js";
export const register = async (req,res) => res.status(201).json(await authService.register(req.body));
export const login = async (req,res) => res.json(await authService.login(req.body));
export const me = async (req,res) => res.json(await authService.currentUser(req.user.sub));
