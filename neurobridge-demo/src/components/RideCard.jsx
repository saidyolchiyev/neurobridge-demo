import { Link } from "react-router-dom";
import { Star, Clock3, Users, ArrowUpRight, Sparkles } from "lucide-react";

export default function RideCard({ ride, score = 0, selected, onSelect, origin, destination }) {
  return <article tabIndex="0" onClick={() => onSelect?.(ride.id)} onKeyDown={(event) => event.key === "Enter" && onSelect?.(ride.id)} className={`ride-card ${selected ? "ride-card-selected" : ""}`}>
    <div className="ride-card-top"><span className="driver-avatar">{ride.driver?.[0] || "S"}</span><div className="ride-driver"><b>{ride.driver}</b><small>{ride.vehicle}</small></div>{ride.rating ? <span className="rating"><Star size={14} fill="currentColor"/> {ride.rating}<small>({ride.reviews || 0})</small></span> : <span className="new-driver">Yeni profil</span>}</div>
    <div className="ride-stops"><div><i/><b>{ride.origin}</b><small>{ride.departure}</small></div><span className="stop-line"><i/></span><div><i className="stop-end"/><b>{ride.destination}</b><small>{ride.date || "Sabah"}</small></div></div>
    <div className="ride-card-meta"><span><Users size={15}/> {ride.seats} boş yer</span><span><Clock3 size={15}/> {ride.departure}</span><strong>{ride.price} <small>AZN</small></strong></div>
    {score > 0 && <div className="match-chip"><Sparkles size={14}/> {score}% uyğunluq</div>}
    {ride.match?.explanation && <p className="ride-match-explanation">{ride.match.explanation}</p>}
    <Link className="ride-details-link" to={`/rides/${ride.id}`} state={{ match: ride.match, matchOrigin: origin, matchDestination: destination }} onClick={(event) => event.stopPropagation()}>Səfər detallarına bax <ArrowUpRight size={15}/></Link>
  </article>;
}
