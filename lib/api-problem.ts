export interface ApiProblemDetails {
  code?: string;
  diagnosticCode?: string;
  requestId?: string;
  retryAfter?: number | null;
  message?: string;
  details?: Record<string, string[]>;
}

export function describeApiProblem(body: { error?: ApiProblemDetails | string } | null, status: number, fallback = "Permintaan belum berhasil diproses.", translate: (message: string, field?: string) => string = value => value): string {
  const problem = body?.error;
  if (typeof problem === "string") return problem;
  const first = problem?.details && Object.entries(problem.details).flatMap(([field, values]) => Array.isArray(values) ? values.map(value => ({field, value})) : []).find(item => typeof item.value === "string" && item.value.trim());
  let message = first ? translate(first.value, first.field) : problem?.message;
  if (!message || message === "An unexpected error occurred.") {
    message = status === 401 ? "Sesi berakhir. Silakan login kembali." : status === 403 ? "Akun tidak memiliki izin untuk tindakan ini." : status === 413 ? "Ukuran unggahan melebihi batas server. Kecilkan berkas dan coba lagi." : status === 429 ? "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi." : status === 502 || status === 503 ? "Layanan backend belum dapat dihubungi. Hubungi admin untuk memeriksa server." : status === 504 ? "Server terlalu lama merespons. Periksa apakah data sudah tersimpan sebelum mencoba lagi." : fallback;
  }
  const code = problem?.diagnosticCode || problem?.code || `HTTP_${status}`;
  const id = problem?.requestId;
  // Server failures already carry their reference for clients that only read message.
  if (id && message.includes(id)) return message;
  return `${message} (Kode: ${code}${id ? `; ID: ${id}` : ""})`;
}
