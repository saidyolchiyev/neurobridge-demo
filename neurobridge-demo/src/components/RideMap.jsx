import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { cities } from "../data/mockRides";

const makeIcon = (selected) => L.divIcon({ html: `<span class="vehicle-marker ${selected ? "vehicle-selected" : ""}">🚘</span>`, className: "custom-marker", iconSize: [44, 44], iconAnchor: [22, 22] });
function MapFocus({ position }) { const map = useMap(); useEffect(() => { if (position) map.flyTo(position, 9, { duration: 0.7 }); }, [map, position]); return null; }
export default function RideMap({ rides = [], selectedId, onSelect, focus }) {
  const route = focus?.origin && focus?.destination && cities[focus.origin] && cities[focus.destination] ? [cities[focus.origin], cities[focus.destination]] : null;
  return <MapContainer center={[40.4093, 49.8671]} zoom={7} className="ride-map" scrollWheelZoom>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <MapFocus position={focus?.position || (focus?.origin ? cities[focus.origin] : null)} />
    {rides.map((ride) => { const points = ride.match?.routeCoordinates || ride.route?.map((city) => cities[city]).filter(Boolean); return points?.length > 1 ? <Polyline key={`route-${ride.id}`} positions={points} pathOptions={{ color: ride.id === selectedId ? "#078963" : "#55a88a", weight: ride.id === selectedId ? 5 : 3, dashArray: ride.match?.routeCoordinates ? undefined : "7 7", opacity: ride.id === selectedId ? .9 : .45 }} /> : null; })}
    {rides.filter((ride) => ride.id === selectedId && ride.match?.pickupPoint && ride.match?.dropoffPoint).flatMap((ride) => [
      <CircleMarker key={`pickup-${ride.id}`} center={ride.match.pickupPoint} radius={8} pathOptions={{ color: "#fff", weight: 2, fillColor: "#078963", fillOpacity: 1 }}><Popup>Sərnişinin minmə nöqtəsi</Popup></CircleMarker>,
      <CircleMarker key={`dropoff-${ride.id}`} center={ride.match.dropoffPoint} radius={8} pathOptions={{ color: "#fff", weight: 2, fillColor: "#e38a39", fillOpacity: 1 }}><Popup>Sərnişinin düşmə nöqtəsi</Popup></CircleMarker>,
    ])}
    {!rides.length && route && <Polyline positions={route} pathOptions={{ color: "#10a878", weight: 4, dashArray: "9 8", opacity: .8 }} />}
    {rides.map((ride) => <Marker key={ride.id} position={ride.position || cities[ride.origin]} icon={makeIcon(ride.id === selectedId)} eventHandlers={{ click: () => onSelect?.(ride.id) }}>
      <Popup><div className="map-popup"><b>{ride.origin} → {ride.destination}</b><span>{ride.driver}{ride.rating?` · ★ ${ride.rating}`:" · yeni profil"}</span><span>{ride.departure} · {ride.seats} boş yer · {ride.price} AZN</span><Link to={`/rides/${ride.id}`} state={{match:ride.match,matchOrigin:focus?.origin,matchDestination:focus?.destination}}>Səfər detallarına bax →</Link></div></Popup>
    </Marker>)}
    {focus?.position && <Marker position={focus.position}><Popup>Sizin təxmini mövqeyiniz</Popup></Marker>}
  </MapContainer>;
}
