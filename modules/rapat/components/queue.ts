export type Clip = { clientId: string; ownerId: string; meetingId: string; sequence: number; blob: Blob; name: string };
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('rapat-recordings', 2);
    open.onupgradeneeded = () => {
      const store = open.result.objectStoreNames.contains('clips') ? open.transaction!.objectStore('clips') : open.result.createObjectStore('clips', { keyPath: 'clientId' });
      if (!store.indexNames.contains('ownerMeeting')) store.createIndex('ownerMeeting', ['ownerId', 'meetingId']);
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}
async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => { const tx = db.transaction('clips', mode); const req = run(tx.objectStore('clips')); tx.oncomplete = () => { db.close(); resolve(req.result); }; tx.onerror = () => { db.close(); reject(tx.error); }; tx.onabort = () => { db.close(); reject(tx.error); }; });
}
export const clipStore = { put: (clip: Clip) => transaction('readwrite', s => s.put(clip)), remove: (id: string) => transaction('readwrite', s => s.delete(id)), forMeeting: (ownerId: string, meetingId: string) => transaction('readonly', s => s.index('ownerMeeting').getAll([String(ownerId), meetingId])) as Promise<Clip[]> };
export function ownedClips(clips: Clip[], ownerId: string, meetingId: string) {
  return clips.filter(clip => !!clip.ownerId && String(clip.ownerId) === String(ownerId) && clip.meetingId === meetingId);
}
export async function deliverClip(clip: Clip, ownerId: string, send: (clip: Clip) => Promise<unknown>, store = clipStore) {
  if (!clip.ownerId || String(clip.ownerId) !== String(ownerId)) throw new Error('Rekaman ini bukan milik akun aktif. Unggahan dihentikan.');
  await store.put(clip);
  await send(clip);
  await store.remove(clip.clientId);
}
/** Each recorder stop finalizes a complete playable container. Never upload timeslice fragments. */
export function recordClips(stream: MediaStream, onClip: (blob: Blob) => void, onError: (message: string) => void, Recorder = MediaRecorder, onStopped: () => void = () => {}) {
  let active = true;
  let recorder: MediaRecorder;
  let rotating = false;
  let timer: ReturnType<typeof setTimeout>;
  const next = () => {
    if (!active) return;
    try {
      recorder = new Recorder(stream);
      const parts: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) parts.push(event.data); };
      recorder.onerror = () => { active = false; clearTimeout(timer); onError('Perekaman terputus. Periksa klip yang tersedia lalu mulai kembali secara manual.'); stream.getTracks().forEach(t => t.stop()); };
      recorder.onstop = () => {
        clearTimeout(timer);
        if (parts.length) onClip(new Blob(parts, { type: recorder.mimeType || parts[0].type }));
        if (active && rotating) { rotating = false; next(); }
        else {
          if (active) { active = false; onError('Perekaman terputus. Mulai kembali secara manual.'); stream.getTracks().forEach(t => t.stop()); }
          onStopped();
        }
      };
      recorder.start();
      timer = setTimeout(() => { if (recorder.state === 'recording') { rotating = true; recorder.stop(); } }, 60_000);
    } catch { active = false; stream.getTracks().forEach(t => t.stop()); onError('Perekaman tidak dapat dilanjutkan. Mulai kembali secara manual.'); onStopped(); }
  };
  stream.getTracks().forEach(track => track.addEventListener('ended', () => { if (active) { active = false; clearTimeout(timer); onError('Mikrofon terputus. Periksa rekaman lalu mulai kembali.'); if (recorder?.state === 'recording') recorder.stop(); else onStopped(); } }));
  next();
  return () => { active = false; clearTimeout(timer); if (recorder?.state === 'recording') recorder.stop(); stream.getTracks().forEach(t => t.stop()); };
}
