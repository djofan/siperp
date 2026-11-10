import s from "./PhotoLocation.module.css";
import type { PhotoLocation } from "@/contracts/modules/bantuan";
import { photoMapUrl } from "../photo-location";

export function PhotoLocationLink({location}:{location?:PhotoLocation|null}) {
  const href=photoMapUrl(location);
  if(!href||!location)return null;
  return <div className={s.pin}><a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Buka lokasi foto ↗</a><small>{location.source==="exif"?"GPS dari metadata foto":"Lokasi perangkat saat unggah · bukan lokasi pengambilan"}{location.accuracy!=null?` · akurasi ±${Math.ceil(location.accuracy)} m`:""}</small></div>;
}
