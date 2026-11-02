"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Crosshair, ExternalLink, LocateFixed, MapPin, Minus, Plus, Route, Clock3, Navigation, RotateCcw } from "lucide-react";
import type { GeoJSONSource, Map as LibreMap } from "maplibre-gl";
import type { AidDetail } from "@/contracts/modules/bantuan";
import { formatSurveyDistance, nearbyLongitude, surveyDirections, surveyPoint, type SurveyPoint } from "./survey-map-helpers";
import s from "./SurveyMap.module.css";
import { request } from "../api/client";

type LocationResult = SurveyPoint & { label: string; approximate?: boolean };
type RoadRoute = { coordinates: [number, number][]; distance: number; duration: number };

export type { SurveyPoint } from "./survey-map-helpers";
export interface SurveyMapProps {
  row: AidDetail;
  /** Optional display address; destination search uses the authorized server record. */
  address?: string;
  /** Parent decides authorization; default is read-only. */
  editable?: boolean;
  /** Collapse the map initially for completed/non-operational cases. */
  initiallyExpanded?: boolean;
  /** Parent persists applicant coordinates with its current version. Reject on failure. */
  onAddressChange?: (address: string) => Promise<void>;
  onDestination?: (point: SurveyPoint) => void | Promise<void>;
}

/** Remount local location state when the application changes. */
export function SurveyMap(props: SurveyMapProps) {
  return <SurveyMapContent key={`${props.row.id}:${props.row.surveyLocation?.address ?? "legacy"}`} {...props} />;
}

function SurveyMapContent({ row, address, editable = false, initiallyExpanded = true, onDestination, onAddressChange }: SurveyMapProps) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState("");
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const saved = row.surveyLocation ? surveyPoint(row.surveyLocation.latitude, row.surveyLocation.longitude) : surveyPoint(row.applicant.latitude, row.applicant.longitude);
  const savedKey = saved ? `${saved.latitude},${saved.longitude}` : "none";
  const [draft, setDraft] = useState<{ baseline: string; point: SurveyPoint } | null>(null);
  const destination = draft?.baseline === savedKey ? draft.point : saved;
  const [origin, setOrigin] = useState<(SurveyPoint & { accuracy?: number }) | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "error">("idle");
  const [geoError, setGeoError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [customOrigin, setCustomOrigin] = useState(false);
  const [originQuery, setOriginQuery] = useState("");
  const [originLabel, setOriginLabel] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");
  const [candidates, setCandidates] = useState<LocationResult[]>([]);
  const [candidateTarget, setCandidateTarget] = useState<"origin" | "destination">("destination");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [preview, setPreview] = useState(0);
  const [routeAttempt, setRouteAttempt] = useState(0);
  const [routeResult, setRouteResult] = useState<{key:string;data?:RoadRoute;error?:string}|null>(null);
  const routeKey = origin && destination ? `${origin.latitude},${origin.longitude};${destination.latitude},${destination.longitude}` : "";
  const route = routeResult?.key === routeKey ? routeResult.data : undefined;
  const routeError = routeResult?.key === routeKey ? routeResult.error : undefined;
  const routeLoading = !!routeKey && routeResult?.key !== routeKey;
  const searchRequest = useRef(0);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const mounted = useRef(false);
  const geoRequest = useRef(0);
  const saveRequest = useRef(false);
  const editRef = useRef({ selecting, editable, saving: saveState === "loading", savedKey });
  const initial = useRef(destination);
  const heading = useId();
  const panel = useId();
  const fullAddress = row.surveyLocation?.address ?? address ?? ["street", "rtRw", "village", "district", "city"].map(key => row.applicant[key]).filter(value => typeof value === "string" && value.trim()).join(", ");

  useEffect(() => { editRef.current = { selecting, editable, saving: saveState === "loading", savedKey }; }, [selecting, editable, saveState, savedKey]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!candidates.length && !searchError) return;
    feedback.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
    feedback.current?.focus({ preventScroll: true });
  }, [candidates, searchError]);

  useEffect(() => {
    let disposed = false;
    let map: LibreMap | undefined;
    let observer: ResizeObserver | undefined;
    const timeout = window.setTimeout(() => { if (!disposed) setMapState("error"); }, 20000);
    async function start() {
      try {
        const { Map } = await import("maplibre-gl");
        if (disposed || !container.current) return;
        map = new Map({
          container: container.current,
          center: initial.current ? [initial.current.longitude, initial.current.latitude] : [118, -2.5],
          zoom: initial.current ? 14 : 4,
          maxZoom: 19,
          scrollZoom: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          boxZoom: false,
          attributionControl: false,
          style: "https://tiles.openfreemap.org/styles/liberty",
        });
        mapRef.current = map;
        map.touchZoomRotate.disableRotation();
        map.on("load", () => {
          if (disposed || !map) return;
          window.clearTimeout(timeout);
          map.addSource("survey", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addSource("survey-road", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({ id: "survey-halo", type: "line", source: "survey-road", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#fff", "line-width": 9, "line-opacity": .85 } });
          map.addLayer({ id: "survey-line", type: "line", source: "survey-road", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#1767d2", "line-width": 6 } });
          map.addLayer({ id: "survey-points", type: "circle", source: "survey", filter: ["==", "$type", "Point"], paint: { "circle-radius": 9, "circle-color": ["match", ["get", "endpoint"], "origin", "#217750", "destination", "#f59e0b", "#217750"], "circle-stroke-width": 3, "circle-stroke-color": "#fff" } });
          setMapState("ready");
        });
        map.on("error", () => { if (!disposed) { window.clearTimeout(timeout); setMapState("error"); } });
        map.on("click", event => {
          const state = editRef.current;
          if (!state.editable || !state.selecting || state.saving) return;
          const point = surveyPoint(event.lngLat.lat, event.lngLat.wrap().lng);
          if (point) { ++searchRequest.current; setSearching(false); setCandidates([]); setDestinationLabel("Titik rumah dipilih di peta"); setDraft({ baseline: state.savedKey, point }); setSaveState("idle"); setSelecting(false); }
        });
        observer = new ResizeObserver(() => map?.resize());
        observer.observe(container.current);
      } catch { if (!disposed) { window.clearTimeout(timeout); setMapState("error"); } }
    }
    void start();
    return () => { disposed = true; window.clearTimeout(timeout); observer?.disconnect(); mapRef.current = null; map?.remove(); };
  }, [attempt]);

  useEffect(() => {
    if (!routeKey) return;
    const controller = new AbortController();
    const [start, end] = routeKey.split(";").map(point => point.split(",").map(Number));
    async function loadRoute() {
      try {
        const data = await request<RoadRoute>(`applications/${row.id}/route`, { method: "POST", signal: controller.signal,
          body: JSON.stringify({origin:{latitude:start[0],longitude:start[1]},destination:{latitude:end[0],longitude:end[1]}}) });
        if (!controller.signal.aborted) setRouteResult({key:routeKey,data});
      } catch(error) { if (!controller.signal.aborted) setRouteResult({key:routeKey,error:error instanceof Error?error.message:"Rute belum tersedia."}); }
    }
    void loadRoute();
    return () => controller.abort();
  }, [routeKey, routeAttempt, row.id]);

  const lat = destination?.latitude, lng = destination?.longitude;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== "ready") return;
    let disposed = false;
    const markers: { remove: () => void }[] = [];
    void import("maplibre-gl").then(({ Marker }) => {
      if (disposed) return;
      const points = [
        ...(origin ? [{ point: origin, endpoint: "origin", label: "Anda berangkat" }] : []),
        ...(lat !== undefined && lng !== undefined ? [{ point: { latitude: lat, longitude: origin ? nearbyLongitude(origin.longitude, lng) : lng }, endpoint: "destination", label: "Rumah pemohon" }] : []),
      ];
      for (const { point, endpoint, label } of points) {
        const element = document.createElement("div");
        element.className = s.pinLabel;
        element.dataset.endpoint = endpoint;
        const title = document.createElement("strong");
        title.textContent = endpoint === "origin" ? "Lokasi Anda" : row.name;
        const caption = document.createElement("span");
        caption.textContent = endpoint === "origin" ? "Titik berangkat" : "Calon penerima bantuan";
        const meta = document.createElement("small");
        meta.textContent = endpoint === "origin" ? (origin?.accuracy !== undefined ? `GPS · akurasi ±${Math.ceil(origin.accuracy)} m` : "Lokasi pilihan Anda") : "Tujuan kunjungan survei";
        element.append(caption, title, meta);
        element.title = endpoint === "origin" ? originLabel || label : fullAddress;
        element.setAttribute("aria-label", `${caption.textContent}: ${title.textContent}. ${element.title}`);
        markers.push(new Marker({ element, anchor: "bottom", offset: [0, -16] }).setLngLat([point.longitude, point.latitude]).addTo(map));
      }
    });
    return () => { disposed = true; markers.forEach(marker => marker.remove()); };
  }, [lat, lng, origin, mapState, row.name, originLabel, fullAddress]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("survey")) return;
    // Draw the complete road immediately; animation must never own the base route.
    const roadSource = map.getSource("survey-road") as GeoJSONSource | undefined;
    roadSource?.setData({type:"FeatureCollection",features:route ? [{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:route.coordinates}}] : []});
    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function update(animate = false) {
      window.cancelAnimationFrame(frame);
      if (!map || !map.getSource("survey")) return;
      const endLng = lng === undefined ? undefined : origin ? nearbyLongitude(origin.longitude, lng) : lng;
      const features: GeoJSON.Feature[] = [];
      if (lat !== undefined && endLng !== undefined) features.push({ type: "Feature", properties: { endpoint: "destination" }, geometry: { type: "Point", coordinates: [endLng, lat] } });
      if (origin) features.push({ type: "Feature", properties: { endpoint: "origin" }, geometry: { type: "Point", coordinates: [origin.longitude, origin.latitude] } });
      if (origin && lat !== undefined && endLng !== undefined && route) {
        if (animate && !reducedMotion) map.jumpTo({ center: [origin.longitude, origin.latitude], zoom: 13 });
        const road = route.coordinates;
        const bounds = road.reduce((box, point) => [Math.min(box[0],point[0]),Math.min(box[1],point[1]),Math.max(box[2],point[0]),Math.max(box[3],point[1])], [origin.longitude,origin.latitude,origin.longitude,origin.latitude]);
        const wide = map.getContainer().clientWidth > 760;
        map.fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]], { padding: { top: 110, bottom: 70, left: wide ? 90 : 35, right: 60 }, maxZoom: 16, duration: animate && !reducedMotion ? 1800 : 0 });
        const start = performance.now();
        const draw = (now: number) => {
          const progress = !animate || reducedMotion ? 1 : Math.min(1, (now - start) / 1800);
          const eased = 1 - (1 - progress) ** 3;
          const cursor = eased * (road.length - 1);
          const index = Math.min(Math.floor(cursor), road.length - 2);
          const fraction = cursor - index;
          const moving = [road[index][0] + (road[index+1][0]-road[index][0])*fraction, road[index][1] + (road[index+1][1]-road[index][1])*fraction];
          const trail: GeoJSON.Feature[] = [];
          if (progress < 1) trail.push({ type: "Feature", properties: { endpoint: "travelling" }, geometry: { type: "Point", coordinates: moving } });
          (map?.getSource("survey") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [...features, ...trail] });
          if (progress < 1) frame = window.requestAnimationFrame(draw);
        };
        frame = window.requestAnimationFrame(draw);
        return;
      } else if (lat !== undefined && endLng !== undefined) map.flyTo({ duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900, center: [endLng, lat], zoom: 14 });
      else if (origin) map.flyTo({ duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900, center: [origin.longitude, origin.latitude], zoom: 14 });
      (map.getSource("survey") as GeoJSONSource).setData({ type: "FeatureCollection", features });
    }
    update(true);
    const resize = () => update(false);
    map.on("resize", resize);
    return () => { window.cancelAnimationFrame(frame); map.stop(); map.off("resize", resize); };
  }, [lat, lng, origin, mapState, preview, route]);

  function choose(point: SurveyPoint) {
    setDraft({ baseline: savedKey, point }); setSaveState("idle"); setSelecting(false);
  }

  function locate() {
    if (!window.isSecureContext) { setGeoState("error"); setGeoError("Lokasi memerlukan HTTPS atau localhost."); return; }
    if (!navigator.geolocation) { setGeoState("error"); setGeoError("Browser ini tidak mendukung lokasi perangkat."); return; }
    const request = ++geoRequest.current;
    setGeoState("loading"); setGeoError("");
    navigator.geolocation.getCurrentPosition(position => {
      if (!mounted.current || request !== geoRequest.current) return;
      setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }); setOriginLabel("Lokasi perangkat saat ini"); setGeoState("idle");
    }, error => {
      if (!mounted.current || request !== geoRequest.current) return;
      setGeoState("error");
      setGeoError(error.code === 1 ? "Izin lokasi ditolak. Izinkan lokasi di pengaturan browser, lalu coba lagi." : error.code === 3 ? "Pencarian lokasi terlalu lama. Coba lagi di area dengan sinyal lebih baik." : "Lokasi perangkat belum tersedia. Silakan coba lagi.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  async function searchLocation(target: "origin" | "destination") {
    const token = ++searchRequest.current;
    setSearching(true); setSearchError(""); setCandidates([]); setCandidateTarget(target);
    try {
      const places = await request<LocationResult[]>(`applications/${row.id}/locations`, {
        method: "POST", body: JSON.stringify(target === "origin" ? { origin: originQuery.trim() } : {}),
      });
      if (!mounted.current || token !== searchRequest.current) return;
      if (!places.length) { setSearchError("Alamat belum ditemukan. Periksa kelengkapan alamat atau pilih titik tujuan di peta."); return; }
      if (places.length === 1 && !places[0].approximate) acceptLocation(places[0], target);
      else setCandidates(places);
    } catch (error) {
      if (mounted.current && token === searchRequest.current) setSearchError(error instanceof Error ? error.message : "Lokasi belum dapat ditemukan.");
    } finally { if (mounted.current && token === searchRequest.current) setSearching(false); }
  }

  function acceptLocation(place: LocationResult, target: "origin" | "destination") {
    if (target === "origin") { ++geoRequest.current; setGeoState("idle"); setGeoError(""); setOrigin(place); setOriginLabel(place.label); }
    else { choose(place); setDestinationLabel((place.approximate ? "Hasil pencarian alternatif: " : "") + place.label); }
    setCandidates([]); setPreview(value => value + 1);
    container.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
  }

  function checkDistance() {
    setExpanded(true);
    if (!origin && !customOrigin) locate();
    if (!destination) void searchLocation("destination");
    if(routeError){setRouteResult(null);setRouteAttempt(value=>value+1);}
    setPreview(value => value + 1);
    container.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
  }

  async function saveAddress() {
    if (!onAddressChange || addressSaving) return;
    if (addressDraft.trim().length < 10) { setAddressError("Lengkapi alamat survei minimal 10 karakter."); return; }
    setAddressSaving(true); setAddressError("");
    try { await onAddressChange(addressDraft.trim()); setEditingAddress(false); }
    catch (error) { setAddressError(error instanceof Error ? error.message : "Alamat belum tersimpan. Silakan coba lagi."); }
    finally { setAddressSaving(false); }
  }

  async function save() {
    if (!destination || !editable || !onDestination || saveRequest.current) return;
    saveRequest.current = true; setSaveState("loading"); setSaveError("");
    try { await onDestination(destination); if (mounted.current) setSaveState("success"); }
    catch { if (mounted.current) { setSaveState("error"); setSaveError("Titik belum tersimpan. Periksa koneksi atau muat ulang data jika telah diperbarui petugas lain, lalu coba lagi."); } }
    finally { saveRequest.current = false; }
  }

  return <section className={s.card} aria-labelledby={heading}>
    <header className={s.header}><div><p className={s.eyebrow}>KUNJUNGAN LAPANGAN</p><h2 id={heading}>Rencana perjalanan survei</h2><p className={s.subtitle}>Tentukan titik berangkat, periksa tujuan, lalu lihat rute kunjungan Anda.</p></div><button type="button" className={s.secondary} aria-expanded={expanded} aria-controls={panel} onClick={()=>setExpanded(value=>!value)}>{expanded?"Tutup peta":"Buka peta"}</button></header>
    <div id={panel} className={s.body} hidden={!expanded}>
      <div className={`${s.mapFrame} ${selecting ? s.selecting : ""}`}>
        <div ref={container} className={s.map} role="region" aria-label="Peta rute perjalanan survei"/>
        <div className={s.controls}><button type="button" aria-label="Tampilkan seluruh rute" onClick={()=>setPreview(value=>value+1)}><Crosshair size={18}/></button><button type="button" aria-label="Perbesar peta" onClick={()=>mapRef.current?.zoomIn()}><Plus size={18}/></button><button type="button" aria-label="Perkecil peta" onClick={()=>mapRef.current?.zoomOut()}><Minus size={18}/></button></div>
        {selecting&&<div className={s.mapTip}>Ketuk lokasi rumah pada peta untuk menentukan tujuan.</div>}
        <div className={s.attribution}><a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> / <a href="https://www.openmaptiles.org" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> / <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a></div>
      </div>
      <div className={s.journeySummary} aria-live="polite"><div className={s.summaryIntro}><span className={s.summaryIcon}><Route size={23}/></span><div><small>RENCANA KUNJUNGAN</small><strong>{route ? "Rute perjalanan tersedia" : "Siapkan perjalanan Anda"}</strong></div></div><div className={s.summaryMetric}><Route size={18}/><div><small>Jarak perjalanan</small><strong>{route ? formatSurveyDistance(route.distance) : routeLoading ? "Menghitung..." : "Belum dihitung"}</strong></div></div><div className={s.summaryMetric}><Clock3 size={18}/><div><small>Estimasi dengan mobil</small><strong>{route ? `${Math.max(1, Math.round(route.duration/60))} menit` : "Pilih titik berangkat"}</strong></div></div><div className={s.summaryMetric}><Navigation size={18}/><div><small>Perkiraan motor*</small><strong>{route ? `${Math.max(1,Math.round(route.distance/1000/30*60))} menit` : "Belum dihitung"}</strong></div></div><button type="button" className={s.replay} disabled={!route} onClick={()=>setPreview(value=>value+1)}><RotateCcw size={17}/>Putar animasi rute</button></div>
      <aside className={s.planner} aria-label="Pengaturan perjalanan">
        <div className={s.plannerHeading}><span className={s.icon}><Navigation size={20}/></span><div><strong>Atur perjalanan</strong><span>{row.number} · Lokasi survei sesuai penugasan</span></div></div>
        <div className={s.stops}>
          <div className={s.originCard}><div className={s.stepTitle}><span>01</span>Titik berangkat</div><div className={s.stop}><span className={s.originDot}/><div><label>LOKASI BERANGKAT</label><strong>{origin ? originLabel || "Lokasi pilihan Anda" : "Pilih titik berangkat"}</strong></div></div>
          <div className={s.mode}><button type="button" aria-pressed={!customOrigin} onClick={()=>{++searchRequest.current;setSearching(false);setCandidates([]);setSearchError("");setCustomOrigin(false);setOrigin(null);locate();}}><LocateFixed size={14}/>Lokasi saya</button><button type="button" aria-pressed={customOrigin} onClick={()=>{++geoRequest.current;++searchRequest.current;setSearching(false);setCandidates([]);setCustomOrigin(true);setOrigin(null);setGeoState("idle");setGeoError("");}}>Lokasi lain</button></div>
          {customOrigin&&<div className={s.searchField}><input aria-label="Alamat berangkat" placeholder="Cari alamat atau nama tempat" value={originQuery} onChange={event=>{++searchRequest.current;setSearching(false);setCandidates([]);setOriginQuery(event.target.value);setOrigin(null);}} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();if(originQuery.trim().length>=3&&!searching)void searchLocation("origin");}}}/><button type="button" disabled={searching||originQuery.trim().length<3} onClick={()=>void searchLocation("origin")}>Cari</button></div>}
          </div><div className={s.destinationCard}><div className={s.stepTitle}><span>02</span>Tujuan kunjungan</div><div className={s.stop}><span className={s.destinationDot}/><div><label>ALAMAT SURVEI DARI CALL CENTER</label><p>{fullAddress||"Alamat belum dilengkapi."}</p></div></div><p className={s.hint}>Pastikan titik tujuan sesuai lokasi yang akan dikunjungi.</p>
            {onAddressChange && (editingAddress ? <div className={s.addressEditor}><label htmlFor={`${panel}-address`}>Alamat survei terbaru</label><textarea id={`${panel}-address`} autoFocus value={addressDraft} onChange={event=>setAddressDraft(event.target.value)} maxLength={1000} disabled={addressSaving} rows={3}/><small>Verifikator tetap ditugaskan. Jika alamat berubah, titik peta lama dihapus agar tujuan dicari ulang.</small>{addressError&&<p role="alert" className={s.error}>{addressError}</p>}<div><button type="button" className={s.primary} disabled={addressSaving} onClick={()=>void saveAddress()}>{addressSaving?"Menyimpan...":"Simpan alamat"}</button><button type="button" className={s.secondary} disabled={addressSaving} onClick={()=>setEditingAddress(false)}>Batal</button></div></div> : <button type="button" className={s.secondary} onClick={()=>{setAddressDraft(fullAddress);setAddressError("");setEditingAddress(true);}}>Ubah alamat survei</button>)}
          </div>
        </div>
        <button type="button" className={s.primary} disabled={searching||geoState==="loading"||(customOrigin&&!origin)} onClick={checkDistance}>{searching?"Mencari alamat tujuan...":geoState==="loading"?"Mencari lokasi Anda...":route?"Periksa rute kembali":"Lihat rute perjalanan"}<ExternalLink size={15}/></button>
        <div ref={feedback} tabIndex={-1} className={s.feedback} hidden={!searchError&&!candidates.length}>
          {searchError&&<p role="alert" className={s.error}>{searchError}</p>}
          {!!candidates.length&&<div className={s.results}><strong>Pilih lokasi yang sesuai</strong><p>{candidates.some(place=>place.approximate)?"Alamat lengkap belum ditemukan. Berikut tempat atau kawasan yang cocok dengan sebagian alamat. Periksa dan pilih titik tujuan yang benar.":"Beberapa alamat cocok. Pilih tujuan yang dimaksud."}</p>{candidates.map((place,index)=><button type="button" key={`${place.latitude},${index}`} onClick={()=>acceptLocation(place,candidateTarget)}><MapPin size={14}/><span>{place.label}{place.approximate&&<small>Hasil alternatif, konfirmasi titik tujuan</small>}</span></button>)}</div>}
        </div>
        {geoError&&<p role="alert" className={s.error}>{geoError}</p>}
        <p className={s.hint}>Rute peta menggunakan profil mobil, tanpa lalu lintas langsung. *Waktu motor adalah perkiraan dengan asumsi 30 km/jam, bukan rute khusus motor; periksa akses jalan dan hindari jalan tol.</p>
        {routeError&&<p role="alert" className={s.error}>{routeError}</p>}
        {destinationLabel&&<p className={s.hint}>{destinationLabel}</p>}
        {origin?.accuracy!==undefined&&<p className={s.hint}>Akurasi GPS sekitar {Math.ceil(origin.accuracy)} m.</p>}
        {editable&&<div className={s.correction}><button type="button" className={s.secondary} disabled={mapState!=="ready"||saveState==="loading"} aria-pressed={selecting} onClick={()=>setSelecting(value=>!value)}><Crosshair size={15}/>{selecting?"Batal memilih":"Sesuaikan titik rumah di peta"}</button>{destination&&onDestination&&<button type="button" className={s.textButton} disabled={saveState==="loading"} onClick={()=>void save()}><Check size={14}/>{saveState==="loading"?"Menyimpan...":"Simpan titik rumah"}</button>}</div>}
        <div aria-live="polite">{saveState==="success"&&<p className={s.success}>Titik tujuan tersimpan.</p>}{saveState==="error"&&<p className={s.error}>{saveError}</p>}</div>
        <a className={s.navigation} href={destination?surveyDirections(destination,origin):`https://www.google.com/maps/search/?${new URLSearchParams({api:"1",query:fullAddress})}`} target="_blank" rel="noopener noreferrer">Buka di Google Maps <ExternalLink size={14}/></a>
        <p className={s.privacy}>Pencarian alamat dan rute didukung <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a>. Alamat dan koordinat perjalanan dikirim untuk menghitung rute. Periksa titik tujuan sebelum berangkat.</p>
      </aside>
      <div className={s.mapStatus} aria-live="polite">{mapState==="loading"?"Memuat peta...":mapState==="error"?<button type="button" onClick={()=>{setMapState("loading");setAttempt(value=>value+1);}}>Peta gagal dimuat - coba lagi</button>:routeLoading?"Menghitung rute jalan...":route?"Rute survei siap":"Pilih lokasi untuk melihat rute"}</div>
    </div>
  </section>;
}
