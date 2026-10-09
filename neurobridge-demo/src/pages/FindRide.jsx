import { useEffect, useMemo, useState } from "react";
import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Navigation, Search, SlidersHorizontal, Users, CalendarDays, Sparkles, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { cities } from "../data/mockRides";
import { useRideStore } from "../store/useRideStore";
import { findMatchingRides } from "../services/matchingService";
import RideCard from "../components/RideCard";
const RideMap = lazy(() => import("../components/RideMap"));
import { mockMode } from "../services/api";
import { normalizeRide, searchRideRequest } from "../services/rideService";
import { parseTravelIntentRequest } from "../services/aiService";

function matchesDeparturePeriod(ride, period) {
  if (period === "any") return true;
  const time = ride.departure || (ride.departureTime && new Date(ride.departureTime).toLocaleTimeString("en-US", { timeZone: "Asia/Baku", hour: "2-digit", hourCycle: "h23" }));
  const hour = Number(String(time || "").split(":")[0]);
  if (Number.isNaN(hour)) return true;
  if (period === "morning") return hour >= 5 && hour < 12;
  if (period === "afternoon") return hour >= 12 && hour < 17;
  return hour >= 17 && hour < 24;
}

function defaultDepartureDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function FindRide() {
  const rides = useRideStore((s) => s.rides); const [params] = useSearchParams();
  const [origin, setOrigin] = useState(params.get("origin") || "Bakı"); const [destination, setDestination] = useState(params.get("destination") || "Şamaxı");
  const [date, setDate] = useState(params.get("date") || defaultDepartureDate()); const [passengers, setPassengers] = useState(1); const [selected, setSelected] = useState(null); const [focus, setFocus] = useState(null);
  const [maximumPrice, setMaximumPrice] = useState(""); const [departurePeriod, setDeparturePeriod] = useState("any"); const [aiPrompt, setAiPrompt] = useState(""); const [aiSearching, setAiSearching] = useState(false);
  const localResults = useMemo(() => findMatchingRides(rides.filter((r) => (!date || r.date === date) && (!maximumPrice || Number(r.price) <= Number(maximumPrice)) && matchesDeparturePeriod(r, departurePeriod)), origin, destination, passengers), [rides, origin, destination, passengers, date, maximumPrice, departurePeriod]);
  const query=useQuery({queryKey:["rideMatches",origin,destination,date,passengers,maximumPrice,departurePeriod],queryFn:()=>searchRideRequest({origin,destination,date,passengers,maximumPrice,departurePeriod}),enabled:!mockMode,staleTime:30000});
  const searchWithAi = async (event) => {
    event.preventDefault(); if (!aiPrompt.trim()) return;
    setAiSearching(true);
    try {
      const result = await parseTravelIntentRequest(aiPrompt, Object.keys(cities));
      const preferences = result.preferences;
      if (!preferences) throw new Error("AI axtarışı hazırda əlçatan deyil. Filtrləri aşağıda əl ilə seçə bilərsiniz.");
      const originFound = preferences.origin && Object.hasOwn(cities, preferences.origin);
      const destinationFound = preferences.destination && Object.hasOwn(cities, preferences.destination);
      if (originFound) setOrigin(preferences.origin);
      if (destinationFound) setDestination(preferences.destination);
      if (preferences.departureDate) setDate(preferences.departureDate);
      if (preferences.departurePeriod) setDeparturePeriod(preferences.departurePeriod);
      if (preferences.maximumPrice !== null && preferences.maximumPrice !== undefined) setMaximumPrice(String(preferences.maximumPrice));
      if (preferences.passengerCount) setPassengers(preferences.passengerCount);
      setSelected(null);
      if (!originFound || !destinationFound) toast.message("İstiqamətin bir hissəsi tanınmadı; şəhərləri aşağıdakı filtrlərdə seçin.");
      else toast.success(result.available ? "AI axtarış seçimlərinizi hazırladı." : "Sorğunuzdakı tanınan filtrlər tətbiq olundu.");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "AI axtarışı hazırda əlçatan deyil.");
    } finally { setAiSearching(false); }
  };
  useEffect(()=>{if(query.isError)toast.error(query.error.response?.data?.message||"Səfərləri yükləmək mümkün olmadı.")},[query.isError,query.error]);
  const loading=!mockMode&&(query.isPending||query.isFetching);const results=mockMode?localResults:(query.data?.matches||[]).map((item)=>({...normalizeRide(item),match:{...item.match,explanation:item.aiExplanation||item.match?.reasons?.join(". ")}}));
  const locate = () => { if (!navigator.geolocation) return toast.error("Bu brauzerdə məkan xidməti dəstəklənmir."); toast.message("Məkan icazəsi gözlənilir…"); navigator.geolocation.getCurrentPosition(({ coords }) => { setFocus({ position: [coords.latitude, coords.longitude] }); toast.success("Təxmini yeriniz xəritədə göstərilir."); }, (error) => toast.error(error.code === 1 ? "Məkan icazəsi verilmədi. Bakı xəritəsi göstərilir." : "Məkan müəyyən edilmədi. Bakı xəritəsi göstərilir."), { timeout: 8000 }); };
  return <main className="find-page"><div className="find-heading"><div><div className="eyebrow">Yolun sənə uyğununu tap</div><h1>Səfər axtar</h1><p>{mockMode ? "Marşrutuna uyğun demo səfərləri kəşf et." : "Aktiv səfərləri marşrut uyğunluğuna görə araşdır."}</p></div><div className="demo-label"><span className="demo-dot"/> {mockMode ? "Demo səfərlər" : "Canlı səfərlər"}</div></div>
    <div className="find-layout"><aside className="find-sidebar"><form className="ai-search-panel" onSubmit={searchWithAi}><div className="ai-search-title"><Sparkles size={18}/><div><b>AI ilə səfər axtar</b><small>Məsələn: Bakıdan Şamaxıya sabah axşam 2 nəfər, 20 AZN-dək</small></div></div><textarea value={aiPrompt} onChange={(event)=>setAiPrompt(event.target.value)} maxLength={500} placeholder="Səfər istəyinizi öz sözlərinizlə yazın" aria-label="AI səfər axtarışı"/><button className="button button-primary" disabled={aiSearching||!aiPrompt.trim()}>{aiSearching?"Sorğu təhlil olunur…":"AI ilə seçimləri hazırla"}<Sparkles size={15}/></button><p>AI sorğunu filtrlərə çevirir; {mockMode ? "demo səfərlər göstərilir" : "server uyğun səfərləri yoxlayır"}.</p></form><form className="search-panel" onSubmit={(e) => { e.preventDefault(); setSelected(null); }}><div className="search-panel-title"><span><Search size={18}/></span><div><b>Səfərini planlaşdır</b><small>İstiqamətini və vaxtını seç</small></div></div>
      <label className="field-label">Haradan?<span className="select-wrap"><MapPin size={16}/><select value={origin} onChange={(e)=>setOrigin(e.target.value)}>{Object.keys(cities).map(c=><option key={c}>{c}</option>)}</select></span></label>
      <label className="field-label">Haraya?<span className="select-wrap"><Navigation size={16}/><select value={destination} onChange={(e)=>setDestination(e.target.value)}>{Object.keys(cities).map(c=><option key={c}>{c}</option>)}</select></span></label>
      <div className="search-split"><label className="field-label">Tarix<span className="select-wrap"><CalendarDays size={16}/><input type="date" value={date} onChange={(e)=>setDate(e.target.value)}/></span></label><label className="field-label">Sərnişin<span className="select-wrap"><Users size={16}/><select value={passengers} onChange={(e)=>setPassengers(Number(e.target.value))}><option value="1">1 nəfər</option><option value="2">2 nəfər</option><option value="3">3 nəfər</option><option value="4">4 nəfər</option></select></span></label></div>
      <div className="search-split"><label className="field-label">Çıxış vaxtı<span className="select-wrap"><select value={departurePeriod} onChange={(event)=>setDeparturePeriod(event.target.value)}><option value="any">İstənilən vaxt</option><option value="morning">Səhər</option><option value="afternoon">Günorta</option><option value="evening">Axşam</option></select></span></label><label className="field-label">Maksimum qiymət<span className="select-wrap"><input type="number" min="0" max="1000" step="0.5" value={maximumPrice} onChange={(event)=>setMaximumPrice(event.target.value)} placeholder="AZN"/></span></label></div><button className="button button-primary search-submit"><Search size={17}/> Səfərləri göstər</button><button type="button" onClick={locate} className="locate-button"><LocateFixed size={16}/> Yerimi xəritədə göstər</button></form>
      <div className="results-head"><div><b>{loading?"Axtarılır…":`${results.length} uyğun səfər`}</b><small><Sparkles size={13}/> Marşrut uyğunluğuna görə sıralanıb</small></div><button className="filter-button" title="Yalnız boş yerləri olan səfərlər göstərilir"><SlidersHorizontal size={16}/></button></div>
      {!mockMode && query.data?.explanation && <div className={`match-summary ${query.data.aiAvailable ? "match-summary-ai" : ""}`}><Sparkles size={16}/><div><b>{query.data.aiAvailable ? "AI səfər izahı" : "Uyğunluq izahı"}</b><p>{query.data.explanation}</p></div></div>}<div className="ride-results">{results.length ? results.map((ride)=><RideCard key={ride.id} ride={ride} score={ride.match?.score || ride.score} selected={selected===ride.id} onSelect={setSelected} origin={origin} destination={destination}/>) : !loading&&<div className="empty-state"><span>⌁</span><b>{query.isError&&!mockMode?"Səfərlər yüklənmədi":"Uyğun səfər tapılmadı"}</b><p>{query.isError&&!mockMode?"Marşrut və ya API xidməti hazırda əlçatan deyil.":"Başqa tarix, istiqamət və ya sərnişin sayını yoxla."}</p><button onClick={()=>{if(query.isError&&!mockMode)query.refetch();else{setDate("");setPassengers(1)}}}>{query.isError&&!mockMode?"Yenidən yoxla":"Filtrləri sıfırla"}</button></div>}</div></aside>
      <section className="map-panel"><div className="map-topbar"><span><i/> Xəritə görünüşü</span><small>OpenStreetMap · {mockMode ? "demo mövqelər" : "səfər marşrutları"}</small></div><Suspense fallback={<div className="map-loading">Xəritə yüklənir…</div>}><RideMap rides={results} selectedId={selected} onSelect={setSelected} focus={{...focus, origin, destination}}/></Suspense><div className="map-legend"><span><i className="legend-car"/> {mockMode ? "Səfər mövqeləri demo xarakterlidir" : "Səfər mövqeləri verilən marşrut koordinatlarına əsaslanır"}</span><span><i className="legend-route"/> Seçilmiş istiqamət</span></div></section>
    </div></main>;
}
