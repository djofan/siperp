import type { MetadataRoute } from "next";
export default function manifest():MetadataRoute.Manifest {
  return {id:"/bantuan-app/",name:"Bantuan SIP",short_name:"Bantuan",description:"Tugas lapangan dan penyaluran santunan SIP",start_url:"/bantuan-app/beranda",scope:"/bantuan-app/",display:"standalone",background_color:"#f4f8f4",theme_color:"#ffffff",lang:"id",orientation:"portrait-primary",icons:[{src:"/bantuan-app/icon-192.png",sizes:"192x192",type:"image/png",purpose:"any"},{src:"/bantuan-app/icon-512.png",sizes:"512x512",type:"image/png",purpose:"any"},{src:"/bantuan-app/icon-maskable.png",sizes:"512x512",type:"image/png",purpose:"maskable"}]};
}

export function GET() {
  return Response.json(manifest(),{headers:{"Content-Type":"application/manifest+json; charset=utf-8","Cache-Control":"no-store"}});
}
