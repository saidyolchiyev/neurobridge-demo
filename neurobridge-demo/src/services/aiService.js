import { api } from "./api";

export async function parseTravelIntentRequest(text, cities) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const { data } = await api.post("/ai/search", { text, cities, today }, { timeout: 12000 });
  return data;
}
