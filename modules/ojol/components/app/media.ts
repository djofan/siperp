// URL file privat Ojol (diputar lewat endpoint berizin, bukan folder public).
export function photoUrl(member: { id: string; photo: string | null }): string | null {
  if (!member.photo) return null;
  // Path file ikut berubah saat foto diganti, jadi dipakai sebagai cache-buster.
  const version = member.photo.split("/").pop()?.split(".")[0]?.slice(0, 8) ?? "";
  return `/api/ojol/files/photo/${member.id}?v=${version}`;
}

export function submissionFileUrl(submissionId: string): string {
  return `/api/ojol/files/submission/${submissionId}`;
}
