import { api, mockMode } from "./api";
export async function loginRequest({ email, password }) {
  if (mockMode) { await new Promise((resolve) => setTimeout(resolve, 400)); if (!email || password.length < 4) throw new Error("E-poçt və şifrəni yoxlayın."); return { user: { email }, token: "demo-session" }; }
  try { const { data } = await api.post("/auth/login", { email, password }); if (data.token) localStorage.setItem("yolyoldas-token", data.token); return data; } catch (error) { throw new Error(error.response?.data?.message || "Daxil olmaq mümkün olmadı.", { cause: error }); }
}
export async function registerRequest(payload) {
  if (mockMode) { await new Promise((resolve) => setTimeout(resolve, 450)); return { user: { email: payload.email, name: payload.name, role: payload.role }, token: "demo-session" }; }
  try { const { data } = await api.post("/auth/register", { ...payload, role: payload.role.toUpperCase() }); if (data.token) localStorage.setItem("yolyoldas-token", data.token); return data; } catch (error) { throw new Error(error.response?.data?.message || "Qeydiyyat zamanı xəta baş verdi.", { cause: error }); }
}
