import { videoEmbedUrl } from "../api/policy";

export function VideoPlayer({ provider, url, title }: { provider: string; url: string; title: string }) {
  const src = videoEmbedUrl(provider, url);
  if (!src) return <div className="rounded-2xl border border-lazsip-primary-200 p-8 text-center">Video belum dapat ditampilkan. Silakan hubungi pengelola program.</div>;
  return <iframe title={title} src={src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" className="aspect-video w-full rounded-2xl border-0 bg-black" />;
}
