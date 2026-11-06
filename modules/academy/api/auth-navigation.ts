type AcademyViewer = {
  isSuperadmin: boolean;
  isTeacher: boolean;
  moduleAccess: { role: string }[];
  academyProfile: { mustChangePassword: boolean } | null;
};

export function academyLoginDestination(user: AcademyViewer | null, available: boolean) {
  if (!user) return "/academy/masuk";
  if (user.isSuperadmin || user.moduleAccess.some(access => access.role === "admin")) return "/admin/academy";
  if (user.academyProfile?.mustChangePassword) return "/academy/akun";
  if (!available) return "/academy";
  return user.isTeacher ? "/academy/pengajar" : "/academy/belajar";
}
