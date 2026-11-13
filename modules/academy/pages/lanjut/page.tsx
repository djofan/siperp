import { academyServerHref, getAcademyBasePath } from "@/modules/academy/pwa/server-navigation";
import { redirect } from "next/navigation";
import { getAcademyUser, getAcademyAvailability } from "../../api/access";
import { academyLoginDestination } from "../../api/auth-navigation";

export default async function Page() {
  const user = await getAcademyUser();
  redirect(await academyServerHref(academyLoginDestination(user, user ? await getAcademyAvailability() : false, (await getAcademyBasePath()) === "/academy-app")));
}
