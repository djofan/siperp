import type { MeetingInput, Minutes } from '@/contracts/modules/rapat';
export const emptyMinutes = (): Minutes => ({ summary: '', discussion: [], decisions: [], actions: [] });
export const attendanceLabel = { present: 'Hadir', absent: 'Tidak hadir', excused: 'Izin' };
export function localDate() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const part = (type: string) => parts.find(p => p.type === type)?.value ?? ''; return `${part('year')}-${part('month')}-${part('day')}`; }
export function dateLabel(value: string | null | undefined, withTime = false) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00+07:00` : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(date);
}
export function isOverdue(dueDate: string | null | undefined, status: string, today = localDate()) { return status === 'open' && !!dueDate && dueDate.slice(0,10) < today; }
export function cleanMinutes(minutes: Minutes): Minutes { return { ...minutes, discussion: minutes.discussion.filter(text => text.trim()), decisions: minutes.decisions.filter(text => text.trim()) }; }
export function metadataIssues(value: MeetingInput) {
  const issues: string[] = [];
  if (!value.title.trim()) issues.push('Isi judul rapat.');
  if (!value.meetingDate) issues.push('Pilih tanggal rapat.');
  if (value.participants.some(p => !p.name.trim())) issues.push('Lengkapi nama setiap peserta atau hapus baris yang kosong.');
  return issues;
}
export function finalizeIssues(minutes: Minutes) {
  const issues: string[] = [];
  if (![minutes.summary, ...minutes.discussion, ...minutes.decisions].some(text => (text ?? '').replace(new RegExp('[^\\p{L}\\p{N}]', 'gu'), '').length >= 10)) issues.push('Isi ringkasan, pembahasan, atau keputusan yang bermakna (minimal 10 huruf atau angka dalam satu bagian).');
  minutes.actions.forEach((action,i) => { if (!action.task.trim()) issues.push(`Tindak lanjut ${i+1}: isi tugas yang perlu dikerjakan.`); if (!action.assignee?.trim()) issues.push(`Tindak lanjut ${i+1}: tentukan penanggung jawab (PIC).`); });
  return issues;
}
export function fieldLabel(field: string): string {
  if (field.startsWith('metadata.')) return fieldLabel(field.slice(9));
  const labels: Record<string,string> = { title:'Judul rapat', meetingDate:'Tanggal rapat', startTime:'Waktu mulai', endTime:'Waktu selesai', location:'Tempat', chair:'Pimpinan rapat', notetaker:'Notulis', agenda:'Agenda', template:'Format dokumen', reason:'Alasan membuka kembali', file:'Berkas', version:'Versi data', transcript:'Transkrip',segments:'Potongan percakapan',metadata:'Informasi rapat',minutes:'Isi notulen',participants:'Peserta & kehadiran',institution:'Identitas instansi',workflowStatus:'Status notulen',finalizedAt:'Waktu finalisasi',archivedAt:'Penyimpanan arsip',attachments:'Dokumen pendukung','minutes.actions':'Tindak lanjut','institution.name':'Nama instansi','institution.heading':'Kop dokumen','institution.address':'Alamat instansi','minutes.summary':'Ringkasan', 'minutes.discussion':'Pembahasan', 'minutes.decisions':'Keputusan' };
  const task = field.match(/^minutes\.actions\.(\d+)\.(\w+)/);
  if (task) return `Tindak lanjut ${Number(task[1])+1} · ${{task:'Tugas',assignee:'PIC',dueDate:'Tenggat',status:'Status'}[task[2]] ?? task[2]}`;
  const participant = field.match(/^participants\.(\d+)\.(\w+)/);
  if (participant) return `Peserta ${Number(participant[1])+1} · ${{name:'Nama',position:'Jabatan',attendance:'Kehadiran'}[participant[2]] ?? participant[2]}`;
  return labels[field] ?? field;
}
