import { getProfile } from "@/modules/sarsip/api/data";
import { ProfileEditor } from "@/modules/sarsip/components/admin/ProfileEditor";
export default async function ProfilePage() { const profile = await getProfile(); return <div><h1 className="mb-6 text-2xl font-bold text-foreground">Profil tim SARSIP</h1><ProfileEditor profile={profile}/></div>; }

