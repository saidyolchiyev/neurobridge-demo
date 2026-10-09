import { api, mockMode } from "./api";
export async function getConversation(bookingId) { if(mockMode)return null;const {data}=await api.get(`/messages/${bookingId}`);return data; }
export async function postMessage(bookingId,content) { if(mockMode)return null;const {data}=await api.post(`/messages/${bookingId}`,{content});return data; }
