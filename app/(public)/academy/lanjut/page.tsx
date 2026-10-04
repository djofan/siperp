import { redirect } from "next/navigation";
import { getAcademyUser, getAcademyAvailability } from "@/modules/academy/api/access";
export default async function Page() {
  const user = await getAcademyUser();
  if (!user) redirect("/academy/masuk");
  if (user.academyProfile?.mustChangePassword) redirect("/academy/akun");
  if (!await getAcademyAvailability()) redirect("/academy");
  redirect(user.isTeacher ? "/academy/pengajar" : "/academy/belajar");
}
