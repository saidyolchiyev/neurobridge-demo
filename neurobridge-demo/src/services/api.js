import axios from "axios";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api", timeout: 12000, headers: { "Content-Type": "application/json" } });
api.interceptors.request.use((config) => { const token = localStorage.getItem("yolyoldas-token"); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
export const mockMode = import.meta.env.VITE_USE_MOCK_API !== "false";
