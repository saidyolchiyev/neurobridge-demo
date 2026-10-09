import { api, mockMode } from "./api";
import { cities } from "../data/mockRides";
export async function createRideRequest(ride) {
  if (mockMode) return null;
  const [originLatitude,originLongitude]=cities[ride.origin];const [destinationLatitude,destinationLongitude]=cities[ride.destination];
  const {data}=await api.post("/rides",{originName:ride.origin,destinationName:ride.destination,originLatitude,originLongitude,destinationLatitude,destinationLongitude,departureTime:new Date(`${ride.date}T${ride.departure}:00`).toISOString(),availableSeats:Number(ride.seats),price:Number(ride.price),vehicleModel:ride.vehicle});return data;
}
export async function searchRideRequest({origin,destination,date,passengers=1,maximumPrice,departurePeriod="any"}) {
  if (mockMode) return null;
  const pickup=cities[origin];const dropoff=cities[destination];
  const dayStart=date?new Date(`${date}T00:00:00`):null;const dayEnd=dayStart?new Date(dayStart):null;if(dayEnd)dayEnd.setDate(dayEnd.getDate()+1);
  const {data}=await api.post("/rides/match",{pickup:{latitude:pickup[0],longitude:pickup[1]},dropoff:{latitude:dropoff[0],longitude:dropoff[1]},departureRange:dayStart?{from:dayStart.toISOString(),to:dayEnd.toISOString()}:undefined,departurePeriod,maximumPrice:maximumPrice===""?undefined:Number(maximumPrice),passengerCount:passengers},{timeout:30000});return data;
}
export async function fetchRide(id) { if(mockMode)return null;const {data}=await api.get(`/rides/${id}`);const route=await api.get(`/rides/${id}/route`).then((result)=>result.data).catch(()=>null);if(route)data.match={routeCoordinates:route.coordinates.map((p)=>[p.latitude,p.longitude])};return data; }
export function normalizeRide(ride) {
  return { id:ride.id,driver:ride.driver?.name||ride.driver,origin:ride.originName||ride.origin,destination:ride.destinationName||ride.destination,vehicle:ride.vehicle?.model||ride.driver?.vehicle?.model||ride.vehicle||"Avtomobil",departure:ride.departureTime?new Date(ride.departureTime).toLocaleTimeString("az-AZ",{hour:"2-digit",minute:"2-digit"}):ride.departure,date:ride.departureTime?ride.departureTime.slice(0,10):ride.date,seats:ride.availableSeats??ride.seats,price:Number(ride.price),rating:ride.rating??ride.driver?.rating??null,reviews:ride.reviews??ride.driver?.reviewsCount??0,position:ride.originLatitude!=null?[ride.originLatitude,ride.originLongitude]:null,destinationPosition:ride.destinationLatitude!=null?[ride.destinationLatitude,ride.destinationLongitude]:null,match:ride.match,score:ride.match?.score||ride.score,route:ride.route||(ride.match?.routeCoordinates?[ride.originName||ride.origin,ride.destinationName||ride.destination]:[]) };
}
