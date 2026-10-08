// URL file privat Tanwir (diputar lewat endpoint berizin, bukan folder public).
export function photoUrl(member: { id: string; photo: string | null }): string | null {
  if (!member.photo) return null;
  // Path file ikut berubah saat foto diganti, jadi dipakai sebagai cache-buster.
  const version = member.photo.split("/").pop()?.split(".")[0]?.slice(0, 8) ?? "";
  return `/api/tanwir/files/photo/${member.id}?v=${version}`;
}

export function submissionFileUrl(submissionId: string): string {
  return `/api/tanwir/files/submission/${submissionId}`;
}
