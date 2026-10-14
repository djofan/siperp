"use client";
import { useEffect,useState } from "react";
export function PhotoFields({required=true}:{required?:boolean}){
  const [previews,setPreviews]=useState<string[]>([]);
  useEffect(()=>()=>previews.forEach(url=>URL.revokeObjectURL(url)),[previews]);
  return <div className="tech-photo-field"><label htmlFor="photos">Foto tahap servis {required ? "*" : "(opsional)"}</label><input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required={required} onChange={event=>{const files=Array.from(event.target.files??[]);if(files.length>3 || files.some(file=>file.size>5*1024*1024)){event.target.value="";setPreviews([]);event.target.setCustomValidity("Maksimal 3 foto, masing-masing 5 MB.");event.target.reportValidity();return;}event.target.setCustomValidity("");setPreviews(files.map(file=>URL.createObjectURL(file)));}}/><p>Maksimal 3 foto JPEG/PNG/WebP, 5 MB per foto. Dikompresi dan hanya dapat dilihat staf berizin.</p><div className="tech-photo-grid">{previews.map(url=>
    // eslint-disable-next-line @next/next/no-img-element -- local upload preview
    <img key={url} src={url} alt="Preview foto servis" />)}</div></div>;
}
