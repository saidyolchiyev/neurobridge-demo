import { api, mockMode } from "./api";
export async function quoteBookingApi(rideId,pickup,dropoff) { if(mockMode)return null;const {data}=await api.post("/bookings/quote",{rideId,pickup,dropoff},{timeout:30000});return data; }
export async function requestBookingApi(rideId,pickup,dropoff) { if(mockMode)return null;const {data}=await api.post("/bookings",{rideId,pickup,dropoff},{timeout:30000});return data; }
export async function listBookingsApi() { if(mockMode)return null;const {data}=await api.get("/bookings/me");return data; }
export async function decideBookingApi(id,decision) { if(mockMode)return null;const {data}=await api.patch(`/bookings/${id}/${decision}`);return data; }
export async function decideConsentApi(id,decision) { if(mockMode)return null;const {data}=await api.patch(`/bookings/consents/${id}`,{decision});return data; }
