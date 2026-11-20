export class RequestError extends Error {
  constructor(message: string, public readonly status: number, public readonly fields: Record<string, string[]> = {}) { super(message); this.name = 'RequestError'; }
}
export async function request<T>(path: string, init: RequestInit = {}, unwrap = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try { response = await fetch(`/api/rapat/${path}`, { ...init, headers, credentials: 'same-origin', cache: 'no-store' }); }
  catch (error) { if ((error as Error)?.name === 'AbortError') throw error; throw new RequestError('Belum dapat terhubung ke server. Isian Anda tetap ada; periksa koneksi lalu coba lagi.', 0); }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const fields = body?.errors ?? body?.error?.details ?? {};
    const message = response.status === 409 ? 'Data telah berubah. Salin perubahan Anda lalu muat ulang rapat sebelum mencoba lagi.' : response.status === 401 ? 'Sesi berakhir. Masuk kembali untuk melanjutkan; tulisan Anda tetap ada di halaman ini.' : response.status === 403 ? 'Akun Anda belum memiliki izin untuk tindakan ini. Hubungi pengelola rapat.' : response.status === 404 ? 'Catatan atau berkas tidak ditemukan, atau tidak tersedia untuk akun Anda.' : Object.keys(fields).length ? 'Periksa isian berikut sebelum melanjutkan.' : body?.error?.message || body?.message || 'Permintaan belum berhasil. Periksa koneksi lalu coba lagi.';
    throw new RequestError(message, response.status, fields);
  }
  if (!body) throw new RequestError('Respons belum dapat dibaca. Periksa kembali data rapat sebelum mengulangi tindakan.', 502);
  return (unwrap ? body.data ?? body : body) as T;
}
