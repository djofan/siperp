import type { MeetingSummary, Viewer } from '@/contracts/modules/rapat';
export function canEdit(viewer: Viewer, meeting: Pick<MeetingSummary, 'createdBy'>) {
  return viewer.role === 'admin' || (viewer.role === 'secretary' && String(viewer.id) === String(meeting.createdBy));
}
export function canCreate(viewer: Viewer) { return viewer.role === 'admin' || viewer.role === 'secretary'; }
export const statusLabel = { draft: 'Draf', processing: 'Mengolah', ready: 'Siap', failed: 'Perlu diperiksa' };
