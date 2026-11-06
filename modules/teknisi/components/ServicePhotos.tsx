import type { ServiceMedia } from "../api/workflow";
export function PhotoField({name,label,required=true}:{name:string;label:string;required?:boolean}) {
  return <label className="tech-photo-field" htmlFor={name}>{label}<input id={name} name={name} type="file" accept="image/jpeg,image/png,image/webp" required={required}/><small>JPG, PNG, atau WebP · maksimal 4 MB.</small></label>;
}
export function ServicePhotos({media,stage}:{media:ServiceMedia[];stage?:string}) {
  const titles:Record<string,string>={before:"Foto sebelum servis",after:"Foto setelah servis",payment:"Bukti pembayaran",handover:"Bukti serah terima"};
  const photos = media.filter(photo => !stage || photo.stage === stage);
  return <div className="tech-photo-grid">{photos.map(photo => <a key={photo.id} href={`/api/teknisi/media/${photo.id}`} target="_blank" rel="noopener noreferrer">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`/api/teknisi/media/${photo.id}`} alt={titles[photo.stage] ?? "Dokumentasi servis"} loading="lazy"/>
    <small>{titles[photo.stage] ?? photo.stage}</small>
  </a>)}</div>;
}
