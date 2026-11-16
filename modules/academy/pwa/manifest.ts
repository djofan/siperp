import type { MetadataRoute } from "next";

export const academyManifest: MetadataRoute.Manifest = {
  id: "/academy/",
  name: "Insan Academy",
  short_name: "Academy",
  description: "Belajar, ujian, dan tanya jawab Insan Academy.",
  lang: "id",
  start_url: "/academy/lanjut",
  scope: "/academy/",
  display: "standalone",
  background_color: "#f8fafc",
  theme_color: "#047857",
  icons: [
    { src: "/academy-pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/academy-pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/academy-pwa/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  shortcuts: [
    { name: "Materi belajar", url: "/academy/materi" },
    { name: "Ujian saya", url: "/academy/kuis" },
    { name: "Tanya jawab", url: "/academy/tanya-jawab" },
  ],
};

export const academyAppManifest: MetadataRoute.Manifest = {
  ...academyManifest, id: "/academy-app/", scope: "/academy-app/", start_url: "/academy-app/lanjut",
  shortcuts: [
    { name: "Materi Belajar", url: "/academy-app/materi" },
    { name: "Ujian Saya", url: "/academy-app/kuis" },
    { name: "Progres Saya", url: "/academy-app/progres" },
  ],
};
export function appManifestGET() {
  return Response.json(academyAppManifest, { headers: {
    "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=0, must-revalidate",
  } });
}
export function GET() {
  return Response.json(academyManifest, { headers: {
    "Content-Type": "application/manifest+json",
    "Cache-Control": "public, max-age=0, must-revalidate",
  } });
}
