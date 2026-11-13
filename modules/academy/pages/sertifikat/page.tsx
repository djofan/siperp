import { requireAcademyProfile } from "../../api/access";
import { ParticipantCertificates } from "../../components/dashboard/ParticipantCertificates";

export default async function CertificatesPage() {
  const { profileId } = await requireAcademyProfile();
  return <div className="academy-page"><ParticipantCertificates profileId={profileId} /></div>;
}
