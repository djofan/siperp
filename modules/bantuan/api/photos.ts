// Processing stays on the device; HEIC is decoded lazily, without a conversion service.
export async function preparePhoto(original: File): Promise<File> {
  if(original.size>30*1024*1024)throw new Error("Ukuran foto asli maksimal 30 MB.");
  let file=original;
  if(/heic|heif/i.test(file.type)||/\.hei[cf]$/i.test(file.name)){
    const {heicTo}=await import("heic-to/csp");
    const blob=await heicTo({blob:file,type:"image/jpeg",quality:0.8});
    file=new File([blob],file.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg"});
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Gunakan JPG, PNG, WEBP, atau HEIC.");
  const bitmap=await createImageBitmap(file);
  try{
    const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext("2d");if(!context)throw new Error("Foto belum dapat diproses pada perangkat ini.");
    context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    for(const quality of [0.8,0.65,0.5]){
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
      if(blob&&blob.size<=1024*1024)return new File([blob],original.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg"});
    }
    throw new Error("Foto masih terlalu besar. Pilih resolusi yang lebih kecil.");
  }finally{bitmap.close();}
}

