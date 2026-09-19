import { AcademyError } from "./errors";
import { safeResourceUrl, videoEmbedUrl } from "./policy";

export function textField(form: FormData, key: string, label: string, max = 191, required = true) {
  const raw = form.get(key);
  if (raw !== null && typeof raw !== "string") throw new AcademyError(`${label} tidak valid.`);
  const value = (raw ?? "").trim();
  if (required && !value) throw new AcademyError(`${label} wajib diisi.`);
  if (value.length > max || new TextEncoder().encode(value).length > 60_000) {
    throw new AcademyError(`${label} terlalu panjang.`);
  }
  return value;
}

export function orderField(form: FormData, key = "order", label = "Urutan") {
  const raw = textField(form, key, label, 10);
  if (!/^\d+$/.test(raw) || Number(raw) > 2_147_483_647) {
    throw new AcademyError(`${label} harus berupa bilangan bulat antara 0 dan 2147483647.`);
  }
  return Number(raw);
}

function urlField(form: FormData, key: string, label: string, required = false) {
  const value = textField(form, key, label, 2048, required);
  if (!value) return null;
  const safe = safeResourceUrl(value);
  if (!safe) throw new AcademyError(`${label} harus berupa URL HTTPS atau path lokal yang valid.`);
  return safe;
}

function commonContent(form: FormData) {
  const title = textField(form, "title", "Judul");
  const slug = textField(form, "slug", "Slug", 160);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new AcademyError("Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.");
  }
  return { title, slug, order: orderField(form), isPublished: form.get("isPublished") === "on" };
}

export function courseInput(form: FormData) {
  return {
    ...commonContent(form),
    shortDescription: textField(form, "shortDescription", "Deskripsi singkat", 2000),
    description: textField(form, "description", "Deskripsi", 30_000, false) || null,
    thumbnailUrl: urlField(form, "thumbnailUrl", "Thumbnail"),
    materialUrl: urlField(form, "materialUrl", "Bahan belajar"),
  };
}

export function chapterInput(form: FormData) {
  return { ...commonContent(form), description: textField(form, "description", "Deskripsi", 30_000, false) || null };
}

export function lessonInput(form: FormData) {
  const videoProvider = textField(form, "videoProvider", "Provider video");
  if (videoProvider !== "YOUTUBE" && videoProvider !== "VIMEO" && videoProvider !== "BUNNY") {
    throw new AcademyError("Provider video tidak didukung.");
  }
  const validatedProvider: "YOUTUBE" | "VIMEO" | "BUNNY" = videoProvider;
  const videoUrl = textField(form, "videoUrl", "URL video", 2048);
  if (!videoEmbedUrl(videoProvider, videoUrl)) throw new AcademyError("URL video tidak cocok dengan provider yang dipilih.");
  return {
    ...commonContent(form), videoProvider: validatedProvider, videoUrl,
    shortDescription: textField(form, "shortDescription", "Deskripsi singkat", 2000, false) || null,
    contentSummary: textField(form, "contentSummary", "Ringkasan materi", 30_000, false) || null,
    thumbnailUrl: urlField(form, "thumbnailUrl", "Thumbnail"),
  };
}

export function attachmentInput(form: FormData) {
  return {
    title: textField(form, "title", "Judul lampiran"),
    fileUrl: urlField(form, "fileUrl", "URL lampiran", true)!,
    fileType: textField(form, "fileType", "Tipe file", 100, false) || null,
    fileSize: textField(form, "fileSize", "Ukuran file", 10, false) ? orderField(form, "fileSize", "Ukuran file") : null,
  };
}

export function mayAdministerAcademy(user: {
  isActive: boolean;
  isSuperadmin: boolean;
  moduleAccess: { role: string; module: { slug: string } }[];
} | null) {
  return !!user?.isActive && (user.isSuperadmin || user.moduleAccess.some(
    (access) => access.module.slug === "academy" && access.role === "admin",
  ));
}
