import { redirect } from "next/navigation";
import { getAcademyUser, getAcademyAvailability } from "../../api/access";
import { academyLoginDestination } from "../../api/auth-navigation";

export default async function Page() {
  const user = await getAcademyUser();
  redirect(academyLoginDestination(user, user ? await getAcademyAvailability() : false));
}
